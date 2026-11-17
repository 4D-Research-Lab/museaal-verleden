import { addEntity, defineQuery, entityExists, hasComponent, removeEntity } from "bitecs";
import {
    AEntity,
    Held,
    MediaGrid,
    MediaLoading,
    Networked,
    Owned,
    Rigidbody,
    Grid,
    Object3DTag
} from "../bit-components";
import { addObject3DComponent } from "../utils/jsx-entity";
import { MediaType } from "../utils/media-utils";

const EMPTY_COLOR = 0x6fc0fd;
const HOVER_COLOR = 0x2f80ed;
const FULL_COLOR = 0x808080;

const gridQuery = defineQuery([MediaGrid, Object3DTag]);
const heldQuery = defineQuery([Held]);

// TODO currently only aframe entiteis can be placed in media frames
function mediaTypeMaskFor(world, eid) {
    if (!hasComponent(world, AEntity, eid)) return 0;
  
    const el = world.eid2obj.get(eid).el;
    let mediaTypeMask = 0;
    mediaTypeMask |= el.components["gltf-model-plus"] && MediaType.MODEL;
    mediaTypeMask |= el.components["media-video"] && MediaType.VIDEO;
    mediaTypeMask |= el.components["media-image"] && MediaType.IMAGE;
    mediaTypeMask |= el.components["media-pdf"] && MediaType.PDF;
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
  
  function inOtherFrame(world, ignoredFrame, eid) {
    const grids = mediaGridQuery(world);
    for (const grid of grids) {
      if (grid === ignoredFrame) continue;
      if (MediaGrid.capturedNid[grid] === Networked.id[eid] || MediaGrid.previewingNid[grid] === Networked.id[eid])
        return true;
    }
    return false;
  }

function getCapturableEntity(world, grid) {
    const physicsSystem = AFRAME.scenes[0].systems["hubs-systems"].physicsSystem;
    const collisions = physicsSystem.getCollisions(Rigidbody.bodyId[grid]);
    const frameObj = world.eid2obj.get(grid);
    for (let i = 0; i < collisions.length; i++) {
      const bodyData = physicsSystem.bodyUuidToData.get(collisions[i]);
      const eid = bodyData.object3D.eid;
      if (
        MediaGrid.mediaType[grid] & mediaTypeMaskFor(world, eid) &&
        !hasComponent(world, MediaLoading, eid) &&
        !inOtherFrame(world, grid, eid) &&
        !isAncestor(bodyData.object3D, frameObj)
      ) {
        return eid;
      }
    }
    return null;
  }

  function isColliding(world, eidA, eidB) {
    const physicsSystem = AFRAME.scenes[0].systems["hubs-systems"].physicsSystem;
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

  function mediaTypesOf(world, entities) {
    let mask = 0;
    for (let i = 0; i < entities.length; i++) {
      mask |= mediaTypeMaskFor(world, entities[i]);
    }
    return mask;
  }


  export function mediaGridSystem(world) {
    const physicsSystem = AFRAME.scenes[0].systems["hubs-systems"].physicsSystem;
    const heldMediaTypes = mediaTypesOf(world, heldQuery(world));
    
    const grids = gridQuery(world);

    for (let i = 0; i < grids.length; i++) {
      const grid = grids[i];
      const captured = world.nid2eid.get(MediaGrid.capturedNid[grid]) || 0;
      //const colliding = captured && isColliding(world, grid, captured);
      console.log("Captured " + captured);

      //const collidingEntity = getCapturableEntity(world, grid); // This will get the entity ID if colliding with the grid.
      
      // if (collidingEntity) {
      //     const isCorrectType = (MediaGrid.mediaType[grid] & mediaTypeMaskFor(world, collidingEntity)) !== 0;
      //     console.log("Entity colliding: " + collidingEntity + " Is correct type: " + isCorrectType);
      // }
    }    
  }


