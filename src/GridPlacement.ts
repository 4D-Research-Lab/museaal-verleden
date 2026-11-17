import { addComponent, addEntity } from "bitecs";
import { BoxGeometry, Mesh, MeshBasicMaterial, Scene, Vector3 } from "three";
import { inflateGrid } from "./inflators/gridInflator";
import { inflateMediaGrid } from "./inflators/media-grid"
import { addObject3DComponent } from "./utils/jsx-entity";
import { HubsWorld } from "./app";

// Define the interaction handler
function yourCustomHandler(entity: number, event: MouseEvent) {
    // Implement your interaction logic here
    console.log('Mesh was interacted with!', entity, event);
    // Add more complex interaction logic here, like opening a modal, changing the object’s color, etc.
}

export function GridPlacement(world: HubsWorld, scene: Scene) {
    const eid = addEntity(world);
    // inflateGrid(world, eid, {
    //     rows: 1.0
    // });
    const cubeMesh = inflateMediaGrid(world, eid);

    cubeMesh.position.set(0, 1, 0);

    world.scene.add(cubeMesh);

    // Here you would typically add the mesh to any systems that need to be aware of it.
    // For example, if your application uses a specific interaction system, you would register the mesh and its handler there.
    // This part of the code depends on how your custom Hubs client handles interactions.

    // Example (this is hypothetical and depends on your actual app structure):
    // world.interactionSystem.add(cubeMesh);
}

// Ensure yourCustomHandler is properly registered in your system
// This depends on how your Hubs client application is structured.
// You might need to add this handler to a specific part of your system where interaction handlers are managed.
