import * as THREE from 'three';
import { LightingManager } from '../rendering/LightingManager.js';
import { WallFader } from '../rendering/WallFader.js';
import { CabinBuilder } from '../world/CabinBuilder.js';
import { PropertyManager } from '../property/PropertyManager.js';
import { NavGrid } from '../ai/NavGrid.js';
import { CoverNodes } from '../ai/CoverNodes.js';
import { LineOfSight } from '../ai/LineOfSight.js';
import { VFXManager } from '../vfx/VFXManager.js';
import { Player } from '../player/Player.js';
import { EnemyManager } from '../enemies/EnemyManager.js';
import { ProjectileSystem } from '../combat/ProjectileSystem.js';
import { HitSystem } from '../combat/HitSystem.js';
import { CashPickups } from '../entities/CashPickup.js';
import { Vehicle } from '../entities/Vehicle.js';
import { EconomyManager } from '../economy/EconomyManager.js';
import { ShopManager } from '../economy/ShopManager.js';
import { BountyManager } from '../progression/BountyManager.js';
import { CampaignManager } from '../progression/CampaignManager.js';
import { WaveDirector } from '../waves/WaveDirector.js';
import { SpawnDirector } from '../waves/SpawnDirector.js';
import { CinematicDirector } from '../cinematics/CinematicDirector.js';
import { CABIN } from '../data/properties/cabin.js';
import { CABIN_WAVES } from '../data/waves/cabinWaves.js';
import { EV } from '../core/Events.js';
import { CONFIG } from '../core/Config.js';
import { GameUI } from '../ui/GameUI.js';
import { SmokeTest } from '../tools/SmokeTest.js';

/**
 * Chapter 1 gameplay scene. Assembles the world object every system shares, runs the
 * simulation, and handles pause / game over / retry / chapter end.
 */
export class CabinScene {
  constructor(game, { fresh = true, skipIntro = false } = {}) {
    this.game = game;
    this.name = 'cabin';
    this.ready = false;
    this.fresh = fresh;
    this.skipIntro = skipIntro;
  }

  async enter(ctx) {
    this.ctx = ctx;
    const events = ctx.events;
    const scene = new THREE.Scene();
    const lighting = new LightingManager(scene, ctx.quality);
    const wallFader = new WallFader();
    const builder = new CabinBuilder(CABIN, { scene, assets: ctx.assets, lighting, wallFader, quality: ctx.quality }).build();

    const world = this.world = {
      ctx, events, scene, lighting, wallFader, builder, assets: ctx.assets,
      colliders: builder.colliders, difficulty: ctx.difficulty, paused: false, cinematicActive: false,
      pathBudget: 0, navDirty: false, ui: ctx.ui, time: 0,
      stats: { kills: 0, shotsFired: 0, shotsHit: 0, meleeHits: 0, meleeKills: 0, cashEarned: 0, cashSpent: 0, deaths: 0, wavesSurvived: 0, playTime: 0 },
    };
    world.vfx = new VFXManager(scene, ctx.quality, lighting);
    world.property = new PropertyManager(CABIN, builder, ctx, world);
    world.cover = new CoverNodes(builder.colliders);
    for (const n of CABIN.coverNodes) world.cover.addNode(n.x, n.z, 'data');
    world.cover.addFromTrees(builder.trees, 22);
    world.los = new LineOfSight(builder.colliders);
    world.player = new Player(world, CABIN.playerStart);
    world.enemies = new EnemyManager(world);
    world.charactersOverlapping = (box) => world.enemies.charactersOverlapping(box);
    world.projectiles = new ProjectileSystem(world);
    world.hits = new HitSystem(world);
    world.pickups = new CashPickups(world);
    // player's parked car (cover)
    const carDef = CABIN.exterior.playerCar;
    world.playerCar = new Vehicle(world, { player: true });
    world.playerCar.place(carDef.x, carDef.z, carDef.rot);
    world.playerCar.makeSolid();
    // nav after all static colliders exist
    world.nav = new NavGrid(CABIN.navGrid, builder.colliders, world.property.portals);
    world.navDirty = false;
    // economy / progression / waves
    const save = ctx.save.data;
    world.economy = new EconomyManager(events, { startingCash: save?.player?.cash ?? 350, pickups: world.pickups, stats: world.stats });
    world.bounty = new BountyManager(events, save?.player?.bounty ?? 25000);
    world.spawner = new SpawnDirector(world, CABIN);
    world.waves = new WaveDirector({
      waves: CABIN_WAVES, events, spawner: world.spawner,
      getActiveCount: () => world.enemies.activeCount,
      capClamp: ctx.quality.preset.maxActiveEnemies, difficulty: ctx.difficulty,
    });
    world.shop = new ShopManager(world);
    world.cinematics = new CinematicDirector(world);
    world.campaign = new CampaignManager(world);
    if (save && !this.fresh) { world.player.fromSave(save.player); Object.assign(world.stats, save.stats || {}); }
    else if (save) world.player.fromSave(save.player);

    // UI
    this.ui = new GameUI(ctx, world);
    this.ui.show();

    // listeners
    this._offs = [
      events.on(EV.ENEMY_DEATH, () => { world.waves.onEnemyDeath(); world.stats.kills++; }),
      events.on(EV.PLAYER_DEATH, () => this.onPlayerDeath()),
      events.on(EV.PLAYER_INSIDE, (e) => wallFader.setInside(e.inside)),
      events.on(EV.WAVE_START, (e) => ctx.audio.setMusicState(e.wave.music)),
      events.on(EV.WAVE_PREP, () => { ctx.audio.setMusicState('prep'); this.ui.touchPhase('prep'); }),
      events.on(EV.WAVE_WARNING, () => { world.shop.setOpen(false); this.ui.touchPhase('warning'); }),
      events.on(EV.WAVE_CLEARED, () => { ctx.audio.setMusicState('prep'); }),
      ctx.quality.onChange((p) => { world.waves.capClamp = p.maxActiveEnemies; }),
    ];
    wallFader.setInside(world.property.isInside(world.player.x, world.player.z));
    ctx.camera.snap();
    ctx.camera.zoomTarget = 1;
    ctx.camera.setOverride(null);
    ctx.input.flush();
    this.ready = true;

    // ambience
    this.ambience = [ctx.audio.startAmbience('wind'), ctx.audio.startAmbience('fridge_hum')];
    ctx.audio.setMusicState('silence');

    // start
    const startIndex = (!this.fresh && save) ? save.campaign.waveIndex : 0;
    if (startIndex === 0 && !this.skipIntro) {
      world.cinematics.intro().then(() => { if (this.ready) world.waves.start(0); });
    } else {
      ctx.ui.fade(0, 0.6);
      world.waves.start(startIndex);
    }
    if (CONFIG.smokeTest) this.smoke = new SmokeTest(ctx, world).run();
  }

  onPlayerDeath() {
    const w = this.world;
    w.stats.deaths++;
    this.ctx.audio.setMusicState('gameover');
    setTimeout(() => { if (this.ready) this.ui.showGameOver(); }, 1600);
  }

  retryWave() {
    const w = this.world;
    this.ui.hideGameOver();
    w.campaign.restoreSnapshot();
    w.wallFader.setInside(w.property.isInside(w.player.x, w.player.z));
    this.ctx.input.flush();
  }

  setPaused(v) {
    if (this.world.paused === v) return;
    this.world.paused = v;
    this.ctx.input.flush();
    this.ctx.events.emit(v ? EV.PAUSE : EV.RESUME, {});
  }

  update(dt) {
    const w = this.world, ctx = this.ctx, input = ctx.input;
    if (input.pressed('pause') && !w.player.health.dead && !w.cinematicActive) {
      if (w.shop.open) w.shop.setOpen(false);
      else this.setPaused(!w.paused);
    }
    if (input.pressed('debug') && ctx.dev) this.ui.debug.toggle();
    if (w.paused) { ctx.camera.update(dt); return; }
    w.time += dt;
    w.stats.playTime += dt;
    if (input.pressed('shop') && !w.cinematicActive) w.shop.setOpen(!w.shop.open);
    if (input.pressed('ready') && !w.cinematicActive) { if (w.shop.open) w.shop.setOpen(false); w.waves.ready(); }
    if (w.shop.open && w.waves.phase !== 'PREP') w.shop.setOpen(false);

    w.pathBudget = ctx.quality.preset.pathRequestsPerFrame;
    w.los.beginFrame();
    if (w.navDirty || w.nav.bakedVersion !== w.colliders.version) { w.nav.bake(); w.navDirty = false; }

    w.player.update(dt);
    w.enemies.update(dt);
    w.spawner.update(dt);
    w.playerCar.update(dt);
    w.waves.update(dt);
    w.property.update(dt);
    w.pickups.update(dt, w.player);
    w.vfx.update(dt);
    w.lighting.update(dt);
    w.wallFader.update(dt);
    w.cinematics.update(dt);
    w.projectiles.endFrame();
    // prop wobble feedback
    for (const p of w.property.props.values()) {
      const g = p.vis.group;
      if (g.userData.wobble > 0) { g.userData.wobble -= dt * 5; g.rotation.z = (p.destroyed ? g.rotation.z : Math.sin(g.userData.wobble * 30) * 0.03 * g.userData.wobble); }
    }
    ctx.camera.update(dt);
    w.lighting.followShadow(w.player.x, w.player.z);
    this.ui.update(dt);
  }

  render() { this.ctx.renderer.render(this.world.scene, this.ctx.camera.camera); }

  async exit() {
    this.ready = false;
    for (const off of this._offs) off();
    this.ui.hide();
    this.world.cinematics.abort();
    this.world.economy.dispose();
    this.world.bounty.dispose();
    this.world.campaign.dispose();
    this.world.property.damage.dispose();
    this.ctx.audio.stopAllAmbience();
    this.ctx.audio.setMusicState('silence');
    this.world.scene.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); });
    this.world.scene.clear();
    this.world = null;
  }
}
