# Prompt History

Base project was bootstrapped with vite+ ("vite plus") standard application template.

26 prompts in total + 4 extra prompts after eval with chatgpt.

## Prompts in Cursor (auto mode)

clear @src/main.ts .. build an interactive euler's formula visualiser instead using canvas , webgl and threejs

add a special preview mode that uses euler's formula to show and edit a cool wave effect using a gradient (colors should be editable, add some preset) using webgl shaders

the wave preview now only varries in the x direction, can we include the y direction as well, and add "twist" ,"zoom","translate" and rotate controls and also to control these using the mac touchpad as well on the preview canvas (these should influence the controls)

the gradient now is only 3 .. add controls to add/remove more stops. make the sunset gradient a proper sunset (golden light to sky), and add a checkbox to enable "add a reverse of the gradient"

if speed is 0 then there's still movement going on, do we miss another speed control (or more) ?

the gradient stops cannot be selected individually, select it by clicking the bar as well

can you also add a way to increase a single gradient stop? because currently these are divided equally

when "Mirror gradient (reverse stops)" is on , something weird is happening to the gradient preview... it looks like the mirrored stops are also visible there, but I just want to see them in the actual visualisation, not in the gradient bar

i cant remove the start and end Gradient stops

when removing the start or end stops ... modify the new start or end stops correctly .. also look at the range input after remving stops.. it seems to not allow dragging then anymore

add readme.md that describes this project

## Follow up prompts in Codex (5.5 "average" mode)

(in dutch)

op de "wave preview" pagina, voeg een mogelijkheid toe om een tekst in te voeren en dan als achtergrond van de tekst de bestaande wave visulatie te hebben. met een checkbox moet je dit aan/uit kunnen zetten. maak ook het font en enkele andere css properties editbaar (ben creatief , bedenk maar wat)

ik zie de tekst met de controls, maar het wave effect is de achtergrond van de pagina als de letters in beeld staan, ik wil dat het dan de achtergrond van de letters zijn , achtergrond van de pagina moet gewoon zwart zijn (dus tekst is een soort van mask bovenop het wave effect)

er zit een transparante laag bovenop de de wave in de tekst waardoor je het wave effect niet goed ziet, haal dit weg of voeg een control toe

zet het wave effect ook achter de stroke, maar wel met een offset zodat je het verschil kan zien

there's now the actual text, a stroke and an outline.. remove that outline

the letters of the text (especially visible with the outline) consists of multiple parts, probably caused by how the font gets transformed into vectors, can we make it seamless so it's a real stroke for a letter that follows its outline?

doet "outside dim" nog iets nuttigs? zo niet haal hem weg.

voeg controls toe om de opacity en andere kleur aspecten van de tekst en stroke afzonderljk te regelen

add an easy way to setup the initial text settings from code , in a separate file

### Translations of dutch prompts

On the "wave preview" page, add an option to enter text and have the existing wave visualization as the background. You should be able to turn this on/off with a checkbox. Also, make the font and a few other CSS properties editable (be creative, just come up with something).

I can see the text with the controls, but the wave effect is the background of the page when the letters are visible. I want it to be the background of the letters then; the background of the page should just be black (so the text is a kind of mask on top of the wave effect).

There is a transparent layer on top of the wave in the text, making the wave effect difficult to see properly. Remove this or add a control.

Place the wave effect after the stroke as well, but with an offset so you can see the difference.

Does "outside dim" still do anything useful? If not, remove it.

Add controls to manage the opacity and other color aspects of the text and stroke separately.

## Eval prompt (codex)

please review if euler's formula (see https://en.wikipedia.org/wiki/Euler%27s_formula) is implemented and visualised correctly

## Documentation prompts (codex)

add a short and clear explainer at the bottom of the "explore"-tab (introduction and explainer). also add a disclaimer there regarding the wave preview tab

extend the introduction text where the 3d visualition is explained , do this in a collapsable control (accordion) which is collapsed by default

## Improve canvas visualisation prompt for accessibility

can you improve the colors/thickness of the canvas visualisation in the "explore"-tab a little bit so that it s a bit better regarding accessibility/wcag? but don't over do it since it's just a demo

i meant the 3d canvas visualisation on the left side, but keep what you improved

## Eval with chatgpt and use the results to improve the project

See https://github.com/devhelpr/euler-visualisation ... this project is the project I talk about in this chat , it has a 3d visualisation about euler formula. How does it work and how can I improve it to really show the working of euler's formula?

Resulting prompt given to codex:

```
some improvements:

To make it show Euler’s formula more directly, I would improve it in these ways:

Put the actual formula visually in the app:

e^(iθ) = cos(θ) + i sin(θ)

Then show the moving point as:

e^(iθ) = x + iy

where:

x = cos(θ)
y = sin(θ)

That makes clear that the blue point is not just “a point on a circle”, but a complex number whose real part is cosine and imaginary part is sine.

Rename the helper lines:

Instead of only “green and gold dashed lines”, label them directly:

real part = cos(θ)
imaginary part = sin(θ)

That will help non-math visitors understand what they are looking at.

Add a split view:

Left: unit circle / complex plane
Right: two waves over time:

cos(θ)
sin(θ)

Then when the point moves around the circle, the waves are drawn at the same time. This would beautifully show how circular motion becomes wave motion.

Add special angle markers:

Show buttons for:

θ = 0 → e^0 = 1
θ = π/2 → e^(iπ/2) = i
θ = π → e^(iπ) = -1
θ = 2π → e^(i2π) = 1

Your “jump to θ = π” is already a good idea. I would expand that into a small “key moments” section.

Make the helix explanation more precise:

The helix is not Euler’s formula itself, but a time/path visualization of repeated values of e^(iθ). So I would phrase it like:

“The circle shows the value of e^(iθ) for one angle. The helix shows how that value evolves as θ keeps increasing over time.”

Make Fourier a separate optional layer:

Your Wave Preview already uses sums of complex exponentials in the shader. That is a great next step. To make the connection clearer, add a simple mode:

e^(iθ) + 0.5e^(i3θ) + 0.25e^(i5θ)

Then show how adding rotating circles creates a more complex wave. That would make the bridge from Euler → complex waves → Fourier much clearer.

Best improvement overall: add a “Circle → Waves → Fourier” learning flow. First show e^(iθ), then show cosine/sine as projections, then show a sum of rotating complex waves. That would make the project feel less like an artistic visualization and more like a real explanation of Euler’s formula.
```

extra prompts after manual testing:

```
regarding:

Make Fourier a separate optional layer:

Your Wave Preview already uses sums of complex exponentials in the shader. That is a great next step. To make the connection clearer, add a simple mode:

e^(iθ) + 0.5e^(i3θ) + 0.25e^(i5θ)

Then show how adding rotating circles creates a more complex wave. That would make the bridge from Euler → complex waves → Fourier much clearer.

... can we add a button to add circles to the wave preview that uses the same settings as the current wave but with some settings to transform it minimally
```

```
can you also let the adding of the circle influence the wave animation?
```
