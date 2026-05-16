# Prompt History

Base project was bootstrapped with vite+ ("vite plus") standard application template.

21 prompts in total.

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

## follow up prompts in Codex (5.5 "average" mode)

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
