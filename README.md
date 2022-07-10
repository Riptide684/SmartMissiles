# SmartMissiles
Genetic algorithm for missiles to navigate between obstacles.

### Description:
Game designed in JS and rendered with HTML and CSS, where missiles navigate from a start point to finish point in a certain time limit, avoiding obstacles along the way. 
Users can design their own obstacles with the 'edit' feature.
When started, a pool of missiles is created which move randomly across the map.
A fitness function is used to determine how close they came to the end point, and whether or not they crashed.
The missiles then swap their 'genes' based on how well they performed to create the next generation.
Some of the missiles are 'mutated' to prevent early convergence and overfitting.
After some number of generations, around 80% of the missiles reach their target.

### Instructions:
1. Click 'edit' and click in two opposing corners of a rectangle to draw a wall. When finished, click 'done'.
2. Click 'start'.
3. The missiles should appear on screen and you can watch them evolve over time.
