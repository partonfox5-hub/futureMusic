/**
 * BootScene — minimal preload / handoff.
 */

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0e14');
    this.scene.start('Game');
  }
}
