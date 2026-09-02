/** Preloads the asset manifest entries the Cabin uses, then hands off to the menu. */
const PRELOAD = [
  'CHR_ExMob', 'CHR_Goon01', 'CHR_Enforcer01', 'CHR_Soldier01', 'CHR_Hitman01',
  'WPN_Pistol01', 'WPN_Revolver01', 'WPN_Shotgun01', 'WPN_SMG01', 'VEH_Sedan_A',
  'PRP_Couch_A', 'PRP_Table_A', 'PRP_Table_Coffee_A', 'PRP_Chair_A', 'PRP_Chair_Arm_A', 'PRP_Bed_A', 'PRP_Counter_A',
  'PRP_Cabinet_A', 'PRP_Fridge_A', 'PRP_Lamp_Floor_A', 'PRP_Lamp_Ceiling_A', 'PRP_Shelf_A', 'PRP_TV_A', 'PRP_Nightstand_A',
  'PRP_Suitcase_A', 'PRP_Toilet_A', 'PRP_Sink_A', 'PRP_Tub_A', 'ENV_Tree_Pine_A', 'ENV_Rock_A',
];

export class BootScene {
  constructor(game) { this.game = game; this.name = 'boot'; this.ready = false; }

  async enter(ctx) {
    ctx.ui.bootProgress('LOADING ASSETS');
    await ctx.assets.preload(PRELOAD);
    await ctx.assets.settle();
    ctx.ui.bootProgress('');
    this.ready = true;
  }

  update() {}
  render() {}
  async exit() {}
}
