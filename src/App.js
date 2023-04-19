import React, {useRef, useEffect, useState, useLayoutEffect} from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";
import {Raycaster, Vector2, AxesHelper} from 'three';
import "./App.css";

function createCross(size = 1, color = 0xff0000) {
    const material = new THREE.LineBasicMaterial({ color });

    const points1 = [];
    points1.push(new THREE.Vector3(-size, 0, 0));
    points1.push(new THREE.Vector3(size, 0, 0));
    const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);

    const points2 = [];
    points2.push(new THREE.Vector3(0, -size, 0));
    points2.push(new THREE.Vector3(0, size, 0));
    const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);

    const line1 = new THREE.Line(geometry1, material);
    const line2 = new THREE.Line(geometry2, material);
    const cross = new THREE.Group();
    cross.add(line1);
    cross.add(line2);
    return cross;
}


const App = () => {
    const graphRef = useRef();
    const rendererRef = useRef();
    const [data, setData] = useState(null);
    const loadedObjectRef = useRef(null);
    const tooltipRef = useRef(null);
    const spheresRef = useRef([]);
    const crossRef = useRef(null);
    const [inputCoordinates, setInputCoordinates] = useState("");



    useEffect(() => {
        const raycaster = new Raycaster();
        const mouse = new Vector2();

        const onMouseMove = (event) => {
            event.preventDefault();

            if (loadedObjectRef.current) {
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

                raycaster.setFromCamera(mouse, graphRef.current.camera());
                const intersects = raycaster.intersectObjects(
                    [...loadedObjectRef.current.children,
                        ...spheresRef.current],
                    true);

                if (intersects.length > 0) {
                    const {x, y, z} = intersects[0].point;
                    tooltipRef.current.style.display = "block";
                    tooltipRef.current.style.top = event.clientY + "px";
                    tooltipRef.current.style.left = event.clientX + "px";
                    tooltipRef.current.textContent = `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`;
                } else {
                    tooltipRef.current.style.display = "none";
                }
            }
        };

        const objLoader = new OBJLoader();
        objLoader.load("lh.obj", (object) => {
            object.traverse((node) => {
                if (node.material) {
                    node.material.opacity = 0.3;
                    node.material.transparent = true;
                }
            });
            graphRef.current.scene().add(object);
            loadedObjectRef.current = object;
            window.addEventListener("mousemove", onMouseMove);
        });

        // Create a cross object and add it to the scene
        const cross = createCross();
        crossRef.current = cross
        graphRef.current.scene().add(cross);

        // Add event listener for mouse down
        const onMouseDown = (event) => {
            // If the clicked target is an input element, return early
            if (event.target.tagName.toLowerCase() === "input") {
                return;
            }
            event.preventDefault();

            if (loadedObjectRef.current) {
                // Calculate mouse position in normalized device coordinates
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

                // Update the picking ray with the camera and mouse position
                raycaster.setFromCamera(mouse, graphRef.current.camera());

                // Calculate objects intersecting the picking ray
                const intersects = raycaster.intersectObject(loadedObjectRef.current, true);

                if (intersects.length > 0) {
                    const { x, y, z } = intersects[0].point;
                    console.log(`Clicked coordinates: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
                    cross.position.set(x, y, z);
                }
            }
        };

        window.addEventListener("mousedown", onMouseDown);

        // Clean up the event listener when the component is unmounted
        return () => {
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mousemove", onMouseMove);

        };
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

            // Add the axis helper to the scene
            const axesHelper = new AxesHelper(100); // Adjust the size as needed
            graphRef.current.scene().add(axesHelper);
        }
    }, [graphRef]);


    // Create nodes for each contact point

    const nodes = data ? data.electrodes.flatMap((electrode) =>
        electrode.contact_points.map((point) => ({
            id: point.spacial.x + "-" + point.spacial.y + "-" + point.spacial.z,
            color: electrode.color,
            fx: point.spacial.x,
            fy: point.spacial.y,
            fz: point.spacial.z,
        }))
    ) : [];

    const moveCross = () => {
        const coords = inputCoordinates.split(",").map((coord) => parseFloat(coord.trim()));
        if (coords.length === 3) {
            const cross = crossRef.current;
            cross.position.set(coords[0], coords[1], coords[2]);
        }
    };

    return (
        <>
            <div>
                <input
                    type="text"
                    placeholder="Enter coordinates (x, y, z)"
                    value={inputCoordinates}
                    onChange={(e) => setInputCoordinates(e.target.value)}
                />
                <button onClick={moveCross}>Move Cross</button>
            </div>
            <ForceGraph3D
                ref={graphRef}
                rendererRef={rendererRef}
                graphData={{nodes, links: []}}
                linkWidth={1}
                linkColor={() => "rgba(255, 255, 255, 0.5)"}
                enableNodeDrag={false}
                nodeThreeObject={(node) => {
                    const material = new THREE.MeshLambertMaterial({ color: node.color });
                    const sphereGeometry = new THREE.SphereGeometry(2);
                    const sphere = new THREE.Mesh(sphereGeometry, material);
                    sphere.userData = node;
                    spheresRef.current.push(sphere);
                    return sphere;
                }}
            />
            <div className="tooltip" ref={tooltipRef}></div>
        </>
    );
};

export default App;
