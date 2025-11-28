# Layers

- i would like to implement layers
- i feel layers should be two kinds: (floor/wall layers)
- the current layer is a wall layer
- we can add a floor layer below and above the wall layer
- the same drawing system will create a floor, but now dangling lines/open ended
  shapes won't be possible; we need a closed shape
- the floor layer will fit closely to the next layer, so if its a wall layer, it
  will fit well
- the floor layer will have a fixed height
- floor layer will essentially be the extrusion of the closed shape drawn
- layers can be enabled/disabled (goes away from stack and the next layers will
  fit closely)
- we can duplicate layers
- other layers can be seen with varying transparency depending on depth
- we can rename/reorder layers
- think of layers as stacks kept one over other
- i think the UI of the layer should be at the bottom left, which can be
  collapsed into showing: its unique emoji
- every layer can have a name & an emoji to denote it
- by default it will be collapsed and will open when hovering over it, it will
  only disclose after a delay
- the two type of layers will be denoted by different colors
- so inclosed state it may look like this:

minimised:

^ // chevron up
[a]
[f]
[y]
[o]

expanded:

^ // chevron up
:[a: <label> <on/off>]
:[f: <label> <on/off>]
:[y: <label> <on/off>]
:[o: <label> <on/off>]

- where letters denote their emoji, and color tints on them will denote type
- chevrons will show or hide layers

[L v] // layer icon with down chevron to show the layers

## Rationale

- any shape floor/roof flat roof can be constructed
- duplicating layers will help build double height buildings
- duplicating will also help building roof / floors with similar floor shape as
  that of walls
- perhaps only support <8 layers
