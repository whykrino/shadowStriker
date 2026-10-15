'use strict';

class Bone {
  constructor(parent, length, thickness, angle) {
    this.parent = parent;
    this.length = length;
    this.thickness = thickness;
    this.angle = angle || 0;
    this.color = '#000';
    this.visible = true;

    this.worldX = 0;
    this.worldY = 0;
    this.worldAngle = 0;
    this.endX = 0;
    this.endY = 0;
  }
}

class Skeleton {
  constructor() {
    this.bones = {};
    this.root = null;
  }

  addBone(name, parentName, length, thickness, angle) {
    const parent = parentName ? this.bones[parentName] : null;
    const bone = new Bone(parent, length, thickness, angle);
    this.bones[name] = bone;
    if (!this.root) this.root = bone;
    return bone;
  }

  setPose(pose) {
    for (const name in pose) {
      if (this.bones[name]) this.bones[name].angle = pose[name];
    }
  }

  update(originX, originY, baseAngle, scaleX) {
    if (!this.root) return;
    this._updateBone(this.root, originX, originY, baseAngle, scaleX);
  }

  _updateBone(bone, ox, oy, parentAngle, scaleX) {
    const a = parentAngle + bone.angle * (scaleX < 0 ? -1 : 1);
    bone.worldX = ox;
    bone.worldY = oy;
    bone.worldAngle = a;

    const dx = Math.cos(a) * bone.length * scaleX;
    const dy = Math.sin(a) * bone.length;
    bone.endX = ox + dx;
    bone.endY = oy + dy;

    for (const name in this.bones) {
      const b = this.bones[name];
      if (b.parent === bone) {
        this._updateBone(b, bone.endX, bone.endY, a, scaleX);
      }
    }
  }

  render(ctx) {
    for (const name in this.bones) {
      const bone = this.bones[name];
      if (!bone.visible) continue;
      if (!bone.parent) continue;

      ctx.strokeStyle = bone.color;
      ctx.lineWidth = bone.thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bone.worldX, bone.worldY);
      ctx.lineTo(bone.endX, bone.endY);
      ctx.stroke();
    }
  }
}

const AnimUtils = {
  lerp(a, b, t) { return a + (b - a) * t; },
  keyframes(kf, time) {
    if (time <= kf[0].t) return kf[0].v;
    if (time >= kf[kf.length - 1].t) return kf[kf.length - 1].v;
    for (let i = 0; i < kf.length - 1; i++) {
      if (time >= kf[i].t && time <= kf[i + 1].t) {
        const range = kf[i + 1].t - kf[i].t;
        const local = range > 0 ? (time - kf[i].t) / range : 0;
        return this.lerp(kf[i].v, kf[i + 1].v, local);
      }
    }
    return kf[kf.length - 1].v;
  },
};