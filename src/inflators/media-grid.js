import { addObject3DComponent } from "../utils/jsx-entity";
import { MediaGrid, Rigidbody, PhysicsShape, Networked, Holdable, RemoteHoverTarget, NetworkedMediaGrid} from "../bit-components";
import { addComponent, hasComponent } from "bitecs";
import { MediaType } from "../utils/media-utils";
import { COLLISION_LAYERS } from "../constants";
import { RIGIDBODY_FLAGS } from "../systems/bit-physics";
import { Layers } from "../camera-layers";
import { add } from "../bit-systems/media-loading";

const DEFAULTS = {
  bounds: { x: 1, y: 1, z: 1 },
  mediaType: "all"
};

export function inflateMediaGrid(world, eid, componentProps) {
    componentProps = Object.assign({}, DEFAULTS, componentProps);

    // Create the cube mesh with geometry and material.
    const guide = new THREE.Mesh(
      new THREE.BoxGeometry(componentProps.bounds.x, componentProps.bounds.y, componentProps.bounds.z), // Ensure it's a 3D cube by specifying depth as well.
      new THREE.MeshBasicMaterial({
          color: 0xffffff,
          opacity: 0.5,
          transparent: true
      }),
     
  );
    guide.layers.set(Layers.CAMERA_LAYER_UI);
    // TODO: This is a hack around the physics system addBody call requiring its body to have parent
    guide.parent = new THREE.Group();
    addObject3DComponent(world, eid, guide);
    addComponent(world, MediaGrid, eid, true);
    addComponent(world, NetworkedMediaGrid, eid, true);
    if (!hasComponent(world, Networked, eid)) addComponent(world, Networked, eid);
  
    MediaGrid.mediaType[eid] = {
      all: MediaType.ALL,
      "all-2d": MediaType.ALL_2D,
      model: MediaType.MODEL,
      image: MediaType.IMAGE,
      video: MediaType.VIDEO,
      pdf: MediaType.PDF
    }[componentProps.mediaType];
    MediaGrid.bounds[eid].set([componentProps.bounds.x, componentProps.bounds.y, componentProps.bounds.z]);
  
    addComponent(world, Rigidbody, eid);
    Rigidbody.collisionGroup[eid] = COLLISION_LAYERS.ALL;
    Rigidbody.collisionMask[eid] = COLLISION_LAYERS.INTERACTABLES;
    Rigidbody.flags[eid] = RIGIDBODY_FLAGS.DISABLE_COLLISIONS;
    addComponent(world, PhysicsShape, eid);
    PhysicsShape.halfExtents[eid].set([
      componentProps.bounds.x / 2,
      componentProps.bounds.y / 2,
      componentProps.bounds.z / 2
    ]);

    console.log("Guide: " + guide);
    return guide;
}