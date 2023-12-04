# localstorage-window-sync

## Description
`localstorage-window-sync` is an interactive JavaScript project that demonstrates the synchronization of window positions and states across multiple browser windows using `localStorage`. It features a unique interface where users can drag around softbodies that collide with window edges and can pass through overlapping windows. 

## Live Demo
Check out the live demo [here](https://www.mlml.dev/localstorage-window-sync/).

## Features
- **Window Synchronization**: Utilizes `localStorage` to sync window positions and states.
- **Dynamic Resizing**: Adjusts canvas size on window resize for consistent display.
- **Authority Management**: Manages authority among windows to control the synchronization. Only one window is running the simulation at a time. The hand-off of authority is seamless to the user.
- **Mouse Interaction**: Supports mouse movements and interactions across synchronized windows.
- **Softbody Physics**: Implements softbody dynamics that interact with window boundaries.

## Usage
- **Moving Softbodies**: Use the left mouse button to drag the softbodies around.
- **Spawning Softbodies**: Use the right mouse button to spawn softbodies.
- **Window Interaction**: Open multiple windows of the demo and observe the interaction and synchronization between them.

## Video Demo
If you are on a mobile device or do not want to drag around windows, here is a short video demo of the physics and seamless movement between windows:

https://github.com/0mlml/localstorage-window-sync/assets/63015852/ff953c7b-f45d-4548-8650-ef834a5f7023
