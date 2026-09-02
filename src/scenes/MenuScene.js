import * as THREE from 'three';
import { LightingManager } from '../rendering/LightingManager.js';
import { WallFader } from '../rendering/WallFader.js';
import { CabinBuilder } from '../world/CabinBuilder.js';
import { Vehicle } from '../entities/Vehicle.js';
import { CoverNodes } from '../ai/CoverNodes.js';
import { VFXManager } from '../vfx/VFXManager.js';
import { CABIN } from '../data/properties/cabin.js';
import { TitleScreen } from '../ui/TitleScreen.js';

/**
 * Title screen with a live 3D background: the isolated cabin at night, porch light on,
 * headlights somewhere in the forest, fog. Camera drifts slowly.
 */
export class MenuScene {
  constructor(game) { this.game = game; this.name = 'menu'; this.ready = false; this.t = 0; }

  async enter(ctx) {
    this.ctx = ctx;
    this.scene = new THREE.Scene();
    this.lighting = new LightingManager(this.scene, ctx.quality);
    this.scene.fog.density = 0.035;
    this.wallFader = new WallFader();
    this.builder = new CabinBuilder(CABIN, { scene: this.scene, assets: ctx.assets, lighting: this.lighting, wallFader: this.wallFader, quality: ctx.quality }).build();
    // a fake mini-world so Vehicle can be reused for the headlights-in-the-forest beat
    this.world = { scene: this.scene, assets: ctx.assets, colliders: this.builder.colliders, cover: new CoverNodes(this.builder.colliders), events: ctx.events, ctx, navDirty: false };
    this.world.vfx = new VFXManager(this.scene, ctx.quality, this.lighting);
    this.car = new Vehicle(this.world, { player: true });
    this.car.place(CABIN.exterior.playerCar.x, CABIN.exterior.playerCar.z, CABIN.exterior.playerCar.rot);
    this.headlights = new Vehicle(this.world, {});
    this.headlights.place(6, 38, -2.4);
    this.headlights.setHeadlights(true);
    this.title = new TitleScreen(ctx);
    this.title.show();
    ctx.audio.setMusicState('title');
    ctx.camera.snap();
    ctx.camera.setOverride(new THREE.Vector3(-9, 7, 22), new THREE.Vector3(-1, 1.5, 3), 0.01);
    ctx.camera.update(0.1);
    ctx.ui.fade(0, 1.5);
    this.ready = true;
  }

  update(dt) {
    this.t += dt;
    const a = this.t * 0.05;
    const pos = new THREE.Vector3(-9 + Math.sin(a) * 3, 7 + Math.sin(a * 0.7) * 0.6, 22 + Math.cos(a) * 2);
    this.ctx.camera.setOverride(pos, new THREE.Vector3(-1, 1.5, 3), 2.5);
    this.ctx.camera.update(dt);
    this.lighting.update(dt);
    this.wallFader.update(dt);
    this.car.update(dt);
    this.headlights.update(dt);
    this.world.vfx.update(dt);
    // occasional dust / fog drift near the porch
    if (Math.random() < dt * 0.6) this.world.vfx.emit('smoke', -1 + Math.random() * 4, 0.3, 6 + Math.random() * 4, 0, 0.3, 0, 0.5);
  }

  render() { this.ctx.renderer.render(this.scene, this.ctx.camera.camera); }

  async exit() {
    this.title.hide();
    this.ctx.camera.setOverride(null);
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose?.(); });
    this.scene.clear();
  }
}
