import { defineQuery } from "bitecs";
import { Grid, 
    Object3DTag,
    MediaLoading,
    Rigidbody,
    AEntity } from "../bit-components";
import { HubsWorld } from "../app";
import { paths } from "./userinput/paths";
import { BoxGeometry, Mesh, MeshBasicMaterial, Scene, Vector3 } from "three";

const gridQuery = defineQuery([Grid, Object3DTag]);

export class GridSystem {
    constructor(scene) {
        this.scene = scene;
    }

    
    // tick(userinput){
    //     if (!this.scene.is("entered")) return;
    //     const keyboard = paths.device.keyboard;

    //     if(userinput.get(keyboard.key("w"))){
    //         console.log("key w pressed");
            
    //         const grids = gridQuery(APP.world);

    //         // for (let i = 0; i < grids.length; i++) {
    //         //     const grid = grids[i];

    //         //     const obj = APP.world.eid2obj.get(grid);
                
    //         //     if (obj instanceof Mesh) {
    //         //         // Create a new material with the desired color
    //         //         const newMaterial = new MeshBasicMaterial({ color: 0xff0000 }); // Change color as needed
    //         //         // Apply the new material to the object
    //         //         obj.material = newMaterial;
    //         //     } else {
    //         //         console.error("obj is not a Mesh object.");
    //         //     }
    //         //     console.log(obj);
    //         // }
    //     }
    // }
}