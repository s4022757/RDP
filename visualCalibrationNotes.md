Despite the visual calibrater, the visual cannot be pushed with these sliders to replicate the touch designer visuals
# Colours do not match emotions
Happy: yellow
r: 0.913725
g:1
b:0

calm:
not coloured (star not run through constant, looks default white)

tired: red
r:0.5
g:0
b:0

anxious: purple
r:0.3739
g:0
b:0.552

sad: blue
r:0
g: 0.1843
b:1

frustrated: orange
r: 1
g: 0.5450
b:0


# Geometric shape scales
The size of the shapes are a little off. 
Dimensions are as follows:
Rectangles:
size x: 0.5 fraction aspect
size y: 0.01 fraction aspect
size unit: 2 fraction aspect
Circle (halo):
Radius: 0.2 fraction aspect
Circle (central):
Radius: 0.05 fraction aspect

# Rectangles:
Even with arm width at 0.01, they are too visible
Touch design blur operator parameters on rectangle:
type: gaussian
extend: hold
Pre-shrink: 2
filter size: 10
filterscalex: 1
filterscaley: 1
offsetx: 1 pixel
offsety: 1 pixel
offsetz: 1 pixel
offsetunit: 0
Dither: off

# Circles:
Central circle has no blur applied.
Halo circle has blur:
Type: gaussian
Extend: hold
pre-shrink: 8
filter size: 12
filterscalex: 1
filterscaley: 1
offsetx: 1 pixel
offsety: 1 pixel
offsetz: 1 pixel
offsetunit: 0
Dither: off

# Comp order
These geometrics are composited together via add in this order:
1: Rectangle (y-axis)
2: rectangle (x-axis)
3: circle (halo)
4: circle (central)




