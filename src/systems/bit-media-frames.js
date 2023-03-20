// https://dev.reticulum.io/scenes/7vGnzkM/outdoor-meetup
// A scene with media-frames

import { defineQuery, enterQuery, exitQuery, entityExists, hasComponent, addEntity } from "bitecs";
import {
  AEntity,
  Deleting,
  GLTFModel,
  Held,
  MediaFrame,
  MediaImage,
  MediaLoaded,
  MediaLoading,
  MediaPDF,
  MediaVideo,
  Networked,
  NetworkedMediaFrame,
  Owned,
  Rigidbody
} from "../bit-components";
import { MediaType } from "../utils/media-utils";
import { cloneObject3D, createPlaneBufferGeometry, disposeNode, setMatrixWorld } from "../utils/three-utils";
import { takeOwnership } from "../utils/take-ownership";
import { takeSoftOwnership } from "../utils/take-soft-ownership";
import { findAncestorWithComponent, findChildWithComponent } from "../utils/bit-utils";
import { MediaContentBounds } from "../bit-systems/media-loading";
import { TEXTURES_FLIP_Y } from "../loaders/HubsTextureLoader";
import { addObject3DComponent } from "../utils/jsx-entity";
import { updateMaterials } from "../utils/material-utils";

const EMPTY_COLOR = 0x6fc0fd;
const HOVER_COLOR = 0x2f80ed;
const FULL_COLOR = 0x808080;

const mediaFramesQuery = defineQuery([MediaFrame]);
const enteredMediaFramesQuery = enterQuery(mediaFramesQuery);
const exitedMediaFramesQuery = exitQuery(mediaFramesQuery);

function mediaTypeMaskFor(world, eid) {
  let mediaTypeMask = 0;
  if (hasComponent(world, AEntity, eid)) {
    const el = world.eid2obj.get(eid).el;
    mediaTypeMask |= el.components["gltf-model-plus"] && MediaType.MODEL;
    mediaTypeMask |= el.components["media-video"] && MediaType.VIDEO;
    mediaTypeMask |= el.components["media-image"] && MediaType.IMAGE;
    mediaTypeMask |= el.components["media-pdf"] && MediaType.PDF;
  } else {
    const mediaEid = findChildWithComponent(world, MediaLoaded, eid);
    mediaTypeMask |= hasComponent(world, GLTFModel, mediaEid) && MediaType.MODEL;
    mediaTypeMask |= hasComponent(world, MediaVideo, mediaEid) && MediaType.VIDEO;
    mediaTypeMask |= hasComponent(world, MediaImage, mediaEid) && MediaType.IMAGE;
    mediaTypeMask |= hasComponent(world, MediaPDF, mediaEid) && MediaType.PDF;
  }
  return mediaTypeMask;
}

function isAncestor(a, b) {
  let ancestor = b.parent;
  while (ancestor) {
    if (ancestor === a) return true;
    ancestor = ancestor.parent;
  }
  return false;
}

function isOwnedByRet(world, eid) {
  if (hasComponent(world, AEntity, eid)) {
    const networkedEl = world.eid2obj.get(eid).el;
    const owner = NAF.utils.getNetworkOwner(networkedEl);
    // Legacy networked objects don't set "reticulum" as the owner
    return owner === "scene";
  } else {
    return Networked.owner[eid] === APP.getSid("reticulum");
  }
}

function inOtherFrame(world, ignoredFrame, eid) {
  const frames = mediaFramesQuery(world);
  for (const frame of frames) {
    if (frame === ignoredFrame) continue;
    if (MediaFrame.capturedNid[frame] === Networked.id[eid] || MediaFrame.previewingNid[frame] === Networked.id[eid])
      return true;
  }
  return false;
}

function getCapturableEntity(world, physicsSystem, frame) {
  const collisions = physicsSystem.getCollisions(Rigidbody.bodyId[frame]);
  const frameObj = world.eid2obj.get(frame);
  for (let i = 0; i < collisions.length; i++) {
    const bodyData = physicsSystem.bodyUuidToData.get(collisions[i]);
    const eid = bodyData.object3D.eid;
    if (
      MediaFrame.mediaType[frame] & mediaTypeMaskFor(world, eid) &&
      !hasComponent(world, MediaLoading, eid) &&
      !inOtherFrame(world, frame, eid) &&
      !isAncestor(bodyData.object3D, frameObj)
    ) {
      return eid;
    }
  }
  return null;
}

function isColliding(world, physicsSystem, eidA, eidB) {
  const collisions = physicsSystem.getCollisions(Rigidbody.bodyId[eidA]);
  for (let i = 0; i < collisions.length; i++) {
    const bodyData = physicsSystem.bodyUuidToData.get(collisions[i]);
    const collidedEid = bodyData && bodyData.object3D && bodyData.object3D.eid;
    if (collidedEid === eidB) {
      return true;
    }
  }
  return false;
}

// TODO we only allow capturing media-loader so rely on its bounds calculations for now
function getEntityBounds(world, target) {
  const targetObj = world.eid2obj.get(target);

  let contentBounds;
  if (hasComponent(world, AEntity, target)) {
    contentBounds = targetObj.el.components["media-loader"].contentBounds;
  } else {
    const mediaEid = findChildWithComponent(world, MediaLoaded, target);
    contentBounds = MediaContentBounds.get(mediaEid);
  }

  return contentBounds;
}

function scaleForAspectFit(containerSize, itemSize) {
  return Math.min(containerSize[0] / itemSize.x, containerSize[1] / itemSize.y, containerSize[2] / itemSize.z);
}

const snapToFrame = (() => {
  const framePos = new THREE.Vector3();
  const frameQuat = new THREE.Quaternion();
  const frameScale = new THREE.Vector3();
  const m4 = new THREE.Matrix4();

  return (world, frame, target, contentBounds) => {
    const frameObj = world.eid2obj.get(frame);
    const targetObj = world.eid2obj.get(target);

    frameObj.updateMatrices();
    frameObj.matrixWorld.decompose(framePos, frameQuat, frameScale);

    setMatrixWorld(
      targetObj,
      m4.compose(
        framePos,
        frameQuat,
        frameScale.multiplyScalar(scaleForAspectFit(MediaFrame.bounds[frame], contentBounds))
      )
    );
  };
})();

const setMatrixScale = (() => {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const m4 = new THREE.Matrix4();

  return (obj, scaleArray) => {
    obj.updateMatrices();
    obj.matrixWorld.decompose(position, quaternion, scale);
    setMatrixWorld(obj, m4.compose(position, quaternion, scale.fromArray(scaleArray)));
  };
})();

const frame2mixer = new Map();
function createPreviewMesh(world, frame, capturable) {
  let srcMesh;
  let el;
  let previewMesh;
  let isVideo = false;
  let ratio = 1;
  if (hasComponent(world, AEntity, capturable)) {
    el = world.eid2obj.get(capturable).el;
    const video = el.components["media-video"];
    isVideo = !!video;
    if (isVideo) {
      ratio =
        (video.videoTexture.image.videoHeight || video.videoTexture.image.height) /
        (video.videoTexture.image.videoWidth || video.videoTexture.image.width);
    }
    srcMesh = el.getObject3D("mesh");
  } else {
    const mediaEid = findChildWithComponent(world, MediaLoaded, capturable);
    isVideo = hasComponent(world, MediaVideo, mediaEid);
    ratio = MediaVideo.ratio[mediaEid];
    srcMesh = APP.world.eid2obj.get(mediaEid);
  }

  // Audios can't be cloned so we take a different path for them
  if (isVideo) {
    const previewMaterial = new THREE.MeshBasicMaterial();
    previewMaterial.side = THREE.DoubleSide;
    previewMaterial.transparent = true;
    previewMaterial.opacity = 0.5;

    const geometry = createPlaneBufferGeometry(1, 1, 1, 1, TEXTURES_FLIP_Y);
    previewMesh = new THREE.Mesh(geometry, previewMaterial);
    previewMesh.material.map = srcMesh.material.map;
    previewMesh.material.needsUpdate = true;
    // Preview mesh UVs are set to accommodate textureLoader default, but video textures don't match this
    previewMesh.scale.y *= TEXTURES_FLIP_Y !== previewMesh.material.map.flipY ? -ratio : ratio;
  } else {
    previewMesh = cloneObject3D(srcMesh, false);
    previewMesh.traverse(node => {
      updateMaterials(node, function (srcMat) {
        const mat = srcMat.clone();
        mat.transparent = true;
        mat.opacity = 0.5;
        mat.format = THREE.RGBAFormat;
        mat.blending = THREE.NormalBlending;
        node.material = mat;
        return mat;
      });
    });

    if (hasComponent(world, AEntity, capturable)) {
      const loopAnimation = el.components["loop-animation"];
      if (loopAnimation && loopAnimation.isPlaying) {
        const originalAnimation = loopAnimation.currentActions[loopAnimation.data.activeClipIndex];
        const animation = previewMesh.animations[loopAnimation.data.activeClipIndex];
        const mixer = new THREE.AnimationMixer(previewMesh);
        const action = mixer.clipAction(animation);
        action.syncWith(originalAnimation);
        action.setLoop(THREE.LoopRepeat, Infinity).play();
        frame2mixer.set(frame, mixer);
      }
    }
  }

  // TODO HACK We add this mesh to a group whose position is centered
  //      so that putting this in the middle of a media frame is easy,
  //      but we should just do this math when putting an object into a frame
  //      and not assume an object's root is in the center of its geometry.
  previewMesh.position.setScalar(0);
  previewMesh.quaternion.identity();
  previewMesh.matrixNeedsUpdate = true;
  const aabb = new THREE.Box3().setFromObject(previewMesh);
  aabb.getCenter(previewMesh.position).multiplyScalar(-1);
  previewMesh.matrixNeedsUpdate = true;

  const cloneObj = new THREE.Group();
  cloneObj.add(previewMesh);
  APP.world.scene.add(cloneObj);

  hasComponent(world, AEntity, capturable) && (cloneObj.el = el); // We rely on media-loader component for bounds

  return cloneObj;
}

function showPreview(world, frame, capturable) {
  const previewObj = createPreviewMesh(world, frame, capturable);
  const eid = addEntity(world);
  addObject3DComponent(world, eid, previewObj);

  MediaFrame.preview[frame] = eid;
  MediaFrame.previewingNid[frame] = Networked.id[capturable];
  snapToFrame(world, frame, eid, getEntityBounds(world, capturable));
}

function hidePreview(world, frame) {
  const eid = MediaFrame.preview[frame];
  const previewMesh = APP.world.eid2obj.get(eid);
  // NOTE we intentionally do not dispose of geometries or textures since they are all shared with the original object
  previewMesh?.removeFromParent();

  MediaFrame.preview[frame] = 0;
  MediaFrame.previewingNid[frame] = 0;

  frame2mixer.delete(frame);
}

const zero = [0, 0, 0];
const tmpVec3 = new THREE.Vector3();

export function display(world, physicsSystem, frame, captured, heldMediaTypes) {
  const capturable = !MediaFrame.capturedNid[frame] && getCapturableEntity(world, physicsSystem, frame);
  const shouldPreviewBeVisible =
    (capturable && hasComponent(world, Held, capturable)) || (captured && hasComponent(world, Held, captured));
  if (shouldPreviewBeVisible && !MediaFrame.preview[frame]) {
    showPreview(world, frame, capturable ? capturable : captured);
  } else if (!shouldPreviewBeVisible && MediaFrame.preview[frame]) {
    hidePreview(world, frame);
  }

  const guideEid = MediaFrame.guide[frame];
  const guideObj = world.eid2obj.get(guideEid);
  guideObj.visible = !!(MediaFrame.mediaType[frame] & heldMediaTypes);

  if (guideObj.visible) {
    const captured = world.nid2eid.get(MediaFrame.capturedNid[frame]) || 0;
    const isHoldingObjectOfInterest =
      (captured && hasComponent(world, Held, captured)) || (capturable && hasComponent(world, Held, capturable));

    guideObj.material.uniforms.color.value.set(
      isHoldingObjectOfInterest ? HOVER_COLOR : MediaFrame.capturedNid[frame] ? FULL_COLOR : EMPTY_COLOR
    );
  }
}

function mediaTypesOf(world, entities) {
  let mask = 0;
  for (let i = 0; i < entities.length; i++) {
    mask |= mediaTypeMaskFor(world, entities[i]);
  }
  return mask;
}

export function cleanupMediaFrame(obj) {
  obj.traverse(child => {
    disposeNode(child);
  });
}

const takeOwnershipOnTimeout = new Map();
const heldQuery = defineQuery([Held]);
// const droppedQuery = exitQuery(heldQuery);
export function mediaFramesSystem(world, physicsSystem) {
  enteredMediaFramesQuery(world).forEach(eid => {
    if (Networked.owner[eid] === APP.getSid("reticulum")) {
      takeOwnershipOnTimeout.set(
        eid,
        setTimeout(() => {
          if (Networked.owner[eid] === APP.getSid("reticulum")) {
            takeSoftOwnership(world, eid);
          }
          takeOwnershipOnTimeout.delete(eid);
        }, 10000)
      );
    }

    const guideEid = MediaFrame.guide[eid];
    const guide = world.eid2obj.get(guideEid);
    const frameObj = world.eid2obj.get(eid);
    frameObj.add(guide);
  });

  exitedMediaFramesQuery(world).forEach(eid => {
    const timeout = takeOwnershipOnTimeout.get(eid);
    if (timeout) {
      clearTimeout(timeout);
      takeOwnershipOnTimeout.delete(eid);
    }
  });

  const heldMediaTypes = mediaTypesOf(world, heldQuery(world));
  // const droppedEntities = droppedQuery(world).filter(eid => entityExists(world, eid));
  const mediaFrames = mediaFramesQuery(world);

  for (let i = 0; i < mediaFrames.length; i++) {
    const frame = mediaFrames[i];

    const captured = world.nid2eid.get(MediaFrame.capturedNid[frame]) || 0;
    const isCapturedOwned = hasComponent(world, Owned, captured);
    const isCapturedHeld = hasComponent(world, Held, captured);
    const colliding = captured && isColliding(world, physicsSystem, frame, captured);
    const isFrameDeleting = findAncestorWithComponent(world, Deleting, frame);
    const isFrameOwned = hasComponent(world, Owned, frame);

    if (captured && isCapturedOwned && !isCapturedHeld && !isFrameDeleting && colliding) {
      snapToFrame(world, frame, captured, getEntityBounds(world, captured));
      physicsSystem.updateRigidBodyOptions(captured, { type: "kinematic" });
    } else if (
      (isFrameOwned && MediaFrame.capturedNid[frame] && world.deletedNids.has(MediaFrame.capturedNid[frame])) ||
      (captured && isCapturedOwned && !colliding) ||
      isFrameDeleting
    ) {
      takeOwnership(world, frame);
      NetworkedMediaFrame.capturedNid[frame] = 0;
      NetworkedMediaFrame.scale[frame].set(zero);
      // TODO BUG: If an entity I do not own is captured by the media frame,
      //           and then I take ownership of the entity (by grabbing it),
      //           the physics system does not immediately notice the entity colliding with the frame,
      //           so I immediately think the frame should be emptied.
    } else if (isFrameOwned && MediaFrame.capturedNid[frame] && !captured) {
      NetworkedMediaFrame.capturedNid[frame] = 0;
      NetworkedMediaFrame.scale[frame].set(zero);
    } else if (!NetworkedMediaFrame.capturedNid[frame]) {
      const capturable = getCapturableEntity(world, physicsSystem, frame);
      if (
        capturable &&
        (hasComponent(world, Owned, capturable) || (isOwnedByRet(world, capturable) && isFrameOwned)) &&
        !hasComponent(world, Held, capturable) &&
        !inOtherFrame(world, frame, capturable)
      ) {
        takeOwnership(world, frame);
        takeOwnership(world, capturable);
        NetworkedMediaFrame.capturedNid[frame] = Networked.id[capturable];
        const obj = world.eid2obj.get(capturable);
        obj.updateMatrices();
        tmpVec3.setFromMatrixScale(obj.matrixWorld).toArray(NetworkedMediaFrame.scale[frame]);
        snapToFrame(world, frame, capturable, getEntityBounds(world, capturable));
        physicsSystem.updateRigidBodyOptions(capturable, { type: "kinematic" });
      }
    }

    if (
      NetworkedMediaFrame.capturedNid[frame] !== MediaFrame.capturedNid[frame] &&
      captured &&
      entityExists(world, captured) &&
      isCapturedOwned
    ) {
      // TODO: If you are resetting scale because you lost a race for the frame,
      //       you should probably also move the object away from the frame.
      setMatrixScale(world.eid2obj.get(captured), MediaFrame.scale[frame]);
      physicsSystem.updateBodyOptions(captured, { type: "dynamic" });
    }

    MediaFrame.capturedNid[frame] = NetworkedMediaFrame.capturedNid[frame];
    MediaFrame.scale[frame].set(NetworkedMediaFrame.scale[frame]);

    frame2mixer.forEach(mixer => {
      mixer.update(APP.world.time.delta / 1000);
    });

    display(world, physicsSystem, frame, captured, heldMediaTypes);
  }
}
