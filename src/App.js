import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

const App = () => {
  const graphRef = useRef();
  const [data, setData] = useState(null);

  useEffect(() => {
    const objLoader = new OBJLoader();

    objLoader.load("lh.obj", (object) => {
      object.traverse((node) => {
        if (node.material) {
          node.material.opacity = 0.3;
          node.material.transparent = true;
        }
      });
      graphRef.current.scene().add(object);
    });
  }, []);

  useEffect(() => {
    // Read the text file
    fetch("electrodes.txt")
        .then((response) => response.text())
        .then((text) => {
          // Parse the text data into a JavaScript object
          const parsedData = JSON.parse(text);
          setData(parsedData);
        });
  }, []);

  useLayoutEffect(() => {
    if (graphRef.current) {
      // Create a grid to help visualize the coordinate system
      const size = 200; // Adjust this value to make the grid longer
      const divisions = 20; // Adjust this value to change the number of divisions

      // GridHelper for the XY plane (default)
      const gridHelperXY = new THREE.GridHelper(size, divisions);
      graphRef.current.scene().add(gridHelperXY);

      // GridHelper for the XZ plane
      const gridHelperXZ = new THREE.GridHelper(size, divisions);
      gridHelperXZ.rotation.x = Math.PI / 2;
      graphRef.current.scene().add(gridHelperXZ);

      // GridHelper for the YZ plane
      const gridHelperYZ = new THREE.GridHelper(size, divisions);
      gridHelperYZ.rotation.z = Math.PI / 2;
      graphRef.current.scene().add(gridHelperYZ);
    }
  }, [graphRef]);


  // Create nodes for each contact point
  const nodes = data?.electrodes.flatMap((electrode) =>
      electrode.contact_points.map((point) => ({
        id: point.spacial.x + "-" + point.spacial.y + "-" + point.spacial.z,
        color: electrode.color,
        fx: point.spacial.x,
        fy: point.spacial.y,
        fz: point.spacial.z,
      }))
  );


  return (
      <ForceGraph3D
          ref={graphRef}
          graphData={{ nodes, links: [] }}
          linkWidth={1}
          linkColor={() => "rgba(255, 255, 255, 0.5)"}
          enableNodeDrag={false}
      />
  );
};

export default App;
