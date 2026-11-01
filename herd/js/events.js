"use strict";
/* =======================================================================
   EVENTS
   Shape:
   { id, w (weight), when(s, L, season) → bool, title, text (string|fn),
     choices (array|fn(s)), note (historical context),
     chainOnly: true  → only fires when queued by an earlier choice,
     repeat: true     → can happen more than once }
   Choice: { label, sub, votes:{advisorId:±1}, trait:{traitId:n},
             fx(s) → result text (may be async), chain:[[eventId, minMoons, maxMoons]] }
   ======================================================================= */

/* helpers used by event effects */
function lose(s, n){ n = Math.min(n, s.people); s.people -= n; s.deaths += n; return n; }
function hurtMount(s, id, amt){ const m = s.mounts[id]; if (!m.alive) return ""; m.health = Math.max(0, m.health - amt);
  if (m.health <= 0){ m.alive = false; return ` ${MOUNTS.find(x => x.id === id).name} is dead.`; } return ""; }
const mountName = id => MOUNTS.find(x => x.id === id).name;

const EVENTS = [
  /* ---------------- Traders & neighbors ---------------- */
  { id:"bent", w:3, when:(s,L) => L.id === "timbers", title:"Wagons on the Arkansas",
    text:"A train of freight wagons is camped by the river. Traders from Bent's Fort ride over with kettles, blankets, and powder, asking for robes.",
    choices:[
      { label:"Trade robes", sub:"Each robe brings two goods", votes:{ camp:1, peace:1 }, nat:{ americans:5 }, fx:s => { const n = Math.min(s.robes, 8); s.robes -= n; s.goods += n * 2; return n ? `Traded ${n} robes for ${n*2} goods.` : "You had no robes to trade. The traders shrug and ride on."; } },
      { label:"Ride on", sub:"Keep your robes for later", votes:{ camp:-1 }, fx:() => "You let the wagons pass." }
    ],
    note:"Bent, St. Vrain & Company traded with the Comanche and Kiowa along the Arkansas in the 1840s, and in the mid-1840s built a post on the Canadian River to reach the Comanche trade." },

  { id:"cheyenne", w:3, when:(s,L) => ["timbers"].includes(L.id), title:"Cheyenne visitors",
    text:"A Cheyenne band rides in under a peace pipe. Five summers ago your peoples made a great peace near Bent's Fort. They have come to renew it, and to see your horses.",
    choices:[
      { label:"Give horses, as at the great peace", sub:"30 horses. Generous", votes:{ peace:1, elder:1, war:-1 }, trait:{ generous:2, peace:1 }, nat:{ cheyenne:22 },
        fx:s => { s.horses -= 30; s.goods += 6; s.harmony += 4; s.flags.cheyenne = true; return "You give thirty horses. They give guns, blankets, and kettles. The peace holds, and your name travels north."; } },
      { label:"Feast them, but keep the horses", sub:"Costs 30 food", votes:{ camp:1 }, nat:{ cheyenne:6 }, fx:s => { s.food -= 30; return "A good feast. The Cheyenne leave friendly, though they had hoped for more."; } }
    ],
    note:"In 1840 the Cheyenne and Arapaho made a lasting peace with the Comanche and Kiowa near Bent's Fort. The Comanche and Kiowa gave away so many horses that some Cheyenne could not drive them all home." },

  { id:"comanchero", w:3, when:(s,L) => ["canadian","llano"].includes(L.id), title:"Carts from New Mexico",
    text:"Squealing wooden carts come over the rise. Comancheros from the Pecos villages, with sacks of hard bread, flour, cloth, and iron arrow points.",
    choices:[
      { label:"Trade horses for bread", sub:"6 horses for 90 food", votes:{ camp:1 }, nat:{ comanchero:4 }, fx:s => { if (s.horses < 20) return "You cannot spare horses."; s.horses -= 6; s.food += 90; return "Six horses for bread and flour. The children eat well tonight."; } },
      { label:"Trade robes for iron", sub:"4 robes for 5 goods", votes:{ war:1 }, fx:s => { const n = Math.min(4, s.robes); s.robes -= n; s.goods += Math.round(n * 1.25); return n ? `Traded ${n} robes for iron and cloth.` : "No robes to trade."; } },
      { label:"Send them home", fx:() => "The carts turn back toward the Pecos." }
    ],
    note:"New Mexican traders called Comancheros came onto the plains with bread, flour, cloth, and iron to trade for robes and horses. The trade lasted for most of a century." },

  { id:"kiowa", w:3, when:(s,L) => !s.flags.kiowa && ["wichita","red","timbers","paloduro"].includes(L.id), title:"Kiowa visitors",
    text:"A Kiowa band rides in, dressed for visiting. Their chief asks to camp beside you, share a feast, and talk about riding south together.",
    choices:[
      { label:"Feast with them", sub:"Costs 40 food. Makes allies", votes:{ peace:1, war:1, elder:1 }, trait:{ generous:1 }, nat:{ kiowa:25 },
        fx:s => { s.food -= 40; s.flags.kiowa = true; s.harmony += 5; return "Days of feasting, horse races, and gambling. The Kiowa will ride with you, and they will remember this."; },
        chain:[["kiowa-return", 3, 6]] },
      { label:"Politely decline", votes:{ war:-1 }, nat:{ kiowa:-5 }, fx:() => "The Kiowa camp one night and move on." }
    ],
    note:"The Kiowa and Comanche made peace around 1790 and stayed close allies for generations, often camping, hunting, and raiding together." },

  { id:"kiowa-return", chainOnly:true, when:s => s.flags.kiowa, title:"The Kiowa remember",
    text:s => s.food < s.people * 1.2 ? "Riders on the horizon: the Kiowa band you feasted. They heard your racks were empty. Their packhorses are loaded with dried meat." : "The Kiowa you feasted ride in again, this time with a herd of horses taken in Mexico, and a share for their friends.",
    choices:s => [{ label:"Welcome them", votes:{ peace:1, war:1 }, fx:s => { if (s.food < s.people * 1.2){ s.food += 160; return "160 food, freely given. A feast returned is a friendship made."; } s.horses += 35; return "35 horses, a gift between allies."; } }],
    note:"Generosity was how alliances held. Gifts given in good times came back in hard ones." },

  { id:"texas-agent", w:2, when:(s,L) => ["sansaba","torrey","red","wichita"].includes(L.id) && s.standing >= 40 && !s.councilHeld, title:"A Texan agent with gifts",
    text:"A Texan Indian agent and two Delaware scouts ride in carrying a white flag, tobacco, and an invitation to council at Tehuacana Creek.",
    choices:[
      { label:"Accept the gifts and listen", votes:{ peace:1, camp:1, war:-1 }, trait:{ peace:1 }, fx:s => { s.goods += 3; s.standing += 6; return "Tobacco and cloth. He promises more at the trading house."; } },
      { label:"Send him away", votes:{ war:1, peace:-1 }, fx:s => { s.standing -= 6; return "The agent rides back east with his gifts."; } }
    ],
    note:"Texas and later U.S. agents often used Delaware and Shawnee scouts as guides and interpreters on the southern plains." },

  /* ---------------- The frontier ---------------- */
  { id:"surveyors", w:3, when:(s,L) => ["sansaba","torrey","bigspring"].includes(L.id), title:"Men with chains",
    text:"Scouts report a small party of Texans dragging a long chain across the grass and sighting through a brass instrument on three legs. They are marking the land.",
    choices:[
      { label:"Drive them off", sub:"Frighten them away", votes:{ war:1, elder:1, peace:-1 }, trait:{ brave:1 }, fx:s => { s.standing -= 10; return "The surveyors flee, leaving their stakes. Word will reach the settlements."; } },
      { label:"Take their instruments", sub:"Leave them no way to measure", votes:{ war:1, peace:-1 }, trait:{ brave:1 },
        fx:s => { s.standing -= 18; s.goods += 2; s.heat++; s.flags.compass = true; return "You take the brass compass and the chain. The Texans will remember this."; }, chain:[["compass-rangers", 2, 4]] },
      { label:"Let them pass", votes:{ peace:1, war:-1, elder:-1 }, trait:{ peace:1 }, fx:s => { s.standing += 4; return "They finish their lines and move on. The stakes stay in the ground."; } }
    ],
    note:"Surveyors marked land for sale before settlers arrived. Comanches understood what the chain and compass meant, and survey crews were frequent targets on the Texas frontier." },

  { id:"compass-rangers", chainOnly:true, when:() => true, title:"They came for the compass",
    text:"A Ranger company has followed you for days. Their captain sends a Delaware scout ahead with a message: return the surveyor's instrument, or they attack at dawn.",
    choices:s => [
      { label:"Send the compass back", votes:{ peace:1, war:-1 }, trait:{ peace:1, wise:1 }, fx:s => { s.heat = 0; s.standing += 8; return "The compass goes back wrapped in a robe. The Rangers turn east. Rides Ahead calls it shameful."; } },
      { label:"Move camp in the night", votes:{ elder:1 }, trait:{ wise:1 }, fx:s => { const n = Math.round(s.horses * .06); s.horses -= n; return `You slip away in darkness. ${n} horses lost in the hurry, but no fight.`; } },
      { label:"Meet them", sub:"Fight", votes:{ war:1, peace:-1, elder:-1 }, trait:{ brave:2 }, fx:s => { const d = lose(s, randi(4, 10)); s.standing -= 12; return `A hard fight at dawn. ${d} of your people are killed.${hurtMount(s, "war", 50)}`; } }
    ],
    note:"Taking survey instruments was a known Comanche tactic. Ranger companies pursued raiders deep into the plains, guided by Delaware and Tonkawa scouts." },

  { id:"rangers", w:2, repeat:true, when:(s,L) => ["sansaba","torrey","bigspring"].includes(L.id) && (s.standing < 40 || s.heat > 1), title:"Rangers on your trail",
    text:"A boy rides in hard from the horse herd. Armed Texans, maybe forty, are following the trail toward camp. They carry the new revolvers that fire again and again.",
    choices:s => [
      { label:"Break camp and scatter", sub:"Lose some horses, save lives", votes:{ elder:1, peace:1 }, trait:{ wise:1 }, fx:s => { const n = Math.round(s.horses * .08); s.horses -= n; s.heat = Math.max(0, s.heat - 1); return `The band scatters in small groups and regathers days later. ${n} horses lost in the rush.`; } },
      { label:"Stand and fight", sub:"Defend the camp", votes:{ war:1, elder:-1 }, trait:{ brave:1 }, fx:s => { const d = lose(s, randi(3, 9)); s.standing -= 10; s.heat++; return `The fight is short and bitter. ${d} of your people are killed.${hurtMount(s, "war", 35)}`; } },
      ...(s.standing >= 35 ? [{ label:"Ride out under a white flag", sub:"Ask to talk", votes:{ peace:1, war:-1 }, trait:{ peace:1 }, fx:s => { s.standing += 5; s.heat = 0; return "Their captain agrees to talk. The Rangers ride away, for now."; } }] : [])
    ],
    note:"Texas Rangers patrolled the frontier in the 1840s. Their Colt revolvers, used against Comanche warriors at Walker's Creek in 1844, changed mounted fighting on the plains." },

  /* ---------------- Enemies ---------------- */
  { id:"pawnee", w:2, when:(s,L) => ["timbers","canadian","wichita"].includes(L.id), title:"Pawnee horse thieves",
    text:"At first light, the herd guards find a gap in the horses and moccasin tracks that aren't yours. Pawnee raiders took a string of horses in the night.",
    choices:[
      { label:"Chase them down", sub:"Rides Ahead leads", votes:{ war:1 }, trait:{ brave:1 }, nat:{ pawnee:-6 },
        fx:s => chance(.6) ? (s.horses += 10, s.loyal.war += 8, "Rides Ahead catches them at a river crossing. You get your horses back, and ten of theirs.") : (lose(s, 2), s.horses -= 25, "The Pawnee are waiting in the cottonwoods. Two men die. The horses are gone.") },
      { label:"Let them go", votes:{ elder:1, war:-1 }, fx:s => { s.horses -= 25; return "Twenty-five horses gone. The young men grumble about it for days."; } }
    ],
    note:"The Pawnee, to the north, were long-time enemies of the Comanche. Horse raids between them went back generations." },

  { id:"lipan", w:2, when:(s,L) => ["sansaba","bigspring","torrey"].includes(L.id), title:"Lipan raiders",
    text:"Lipan Apache raiders, old enemies, hit the edge of the horse herd at dusk and drive off a bunch of mares toward the south.",
    choices:[
      { label:"Ride after them", votes:{ war:1 }, trait:{ brave:1 }, nat:{ lipan:-6 }, fx:s => chance(.65) ? (s.horses += 5, "You catch them at the Colorado and take back the mares, and a few more.") : (s.horses -= 20, `They lose you in the brush. Twenty horses gone.${hurtMount(s, "war", 20)}`) },
      { label:"Guard what you have", votes:{ elder:1, peace:1 }, trait:{ wise:1 }, fx:s => { s.horses -= 20; return "Twenty mares lost. The rest are safe."; } }
    ],
    note:"The Comanche drove the Lipan Apache off the southern plains in the 1700s. The two peoples remained bitter enemies through the 1800s." },

  /* ---------------- Land & weather ---------------- */
  { id:"fire", w:2, when:(s,L,se) => se !== 3 && ["llano","red","bigspring","paloduro"].includes(L.id), title:"Smoke on the horizon",
    text:"A long brown wall of smoke is rising to the west, and the wind is pushing it toward camp. The grass is dry.",
    choices:[
      { label:"Set a backfire", sub:"Burn a break around camp", votes:{ elder:1, camp:1 }, trait:{ wise:1 }, fx:s => chance(.75) ? "The backfire holds. The main fire splits around the camp." : (s.horses -= 15, "The backfire holds, barely. Fifteen horses bolt and are lost.") },
      { label:"Run the horses to the river", votes:{ war:1 }, fx:s => { const n = randi(8, 25); s.horses -= n; return `You save the camp but lose ${n} horses in the smoke.`; } }
    ],
    note:"Fire was a hazard and a tool. Plains peoples set fires on purpose to bring up fresh spring grass that drew buffalo and fattened horses." },

  { id:"burn", w:2, when:(s,L,se) => se === 0 && s.moon <= 1 && ["red","llano","bigspring","wichita"].includes(L.id), title:"Old grass",
    text:"Last year's dead grass lies thick and gray. Owl Feather says to burn it now, while the ground is wet, so the new grass comes up green and sweet.",
    choices:[
      { label:"Burn it", votes:{ elder:1, camp:1 }, trait:{ wise:1 }, fx:s => { s.flags.burned = s.loc; return "The fire walks slowly across the plain. Within a moon, this country will be green, and the buffalo will come to it."; } },
      { label:"Leave it", votes:{ elder:-1 }, fx:() => "You leave the old grass standing." }
    ],
    note:"Plains peoples burned grassland in spring to bring fresh growth that drew bison and fed horses. It shaped the prairie for centuries." },

  { id:"hail", w:2, when:(s,L,se) => se <= 1, title:"Hail",
    text:"A green-black cloud. Then stones of ice the size of plums. The horses panic and the lodge covers drum like war drums.",
    choices:[
      { label:"Get the horses into the trees", votes:{ war:1, elder:1 }, fx:s => { const n = randi(4, 12); s.horses -= n; return `Most are saved. ${n} horses are lost or crippled.`; } },
      { label:"Get everyone inside the lodges", votes:{ camp:1 }, fx:s => { const n = randi(10, 22); s.horses -= n; return `No one is hurt, but ${n} horses scatter in the storm.`; } }
    ],
    note:"Spring storms on the southern plains bring violent hail and tornadoes. Camps chose sites with this in mind." },

  { id:"flood", w:2, when:(s,L,se) => se === 0 && ["red","timbers","sansaba"].includes(L.id), title:"The river rises",
    text:"Rain upstream. The river is coming up fast and brown, carrying whole trees.",
    choices:[
      { label:"Move camp to high ground now", votes:{ elder:1, camp:1 }, trait:{ wise:1 }, fx:() => "You move in the rain. By morning your old campsite is under water." },
      { label:"Wait and see", votes:{ elder:-1 }, fx:s => { s.food -= 40; s.robes = Math.max(0, s.robes - 4); return "The water comes in at night. You save the people but lose meat and robes."; } }
    ],
    note:"Plains rivers could rise many feet in hours. Experienced leaders read the water and moved early." },

  { id:"blizzard", w:5, repeat:true, when:(s,L,se) => se === 3 && !L.shelter, title:"Norther",
    text:"The sky goes dark blue in the north, then white. A norther screams across open country. Your camp has no timber, no canyon walls to hide behind.",
    choices:[
      { label:"Use trade goods for warmth", sub:"Blankets and cloth to survive", votes:{ camp:1 }, fx:s => { const g = Math.min(s.goods, 6); s.goods -= g; const n = Math.round(s.horses * (g >= 6 ? .05 : .12)); s.horses -= n; const d = g >= 6 ? 0 : lose(s, randi(2, 6)); return `Three days of storm. ${n} horses freeze.${d ? ` ${d} people do not survive the cold.` : " Everyone lives."}`; } },
      { label:"Wait it out", votes:{ elder:-1 }, fx:s => { const n = Math.round(s.horses * .15); s.horses -= n; const d = lose(s, randi(3, 8)); return `${n} horses and ${d} people are lost to the cold.${hurtMount(s, "runner", 30)}`; } }
    ],
    note:"Winter camps sat in sheltered valleys and canyons with wood and water. In hard winters, cottonwood bark was cut to feed the horses when grass lay under snow." },

  { id:"drought", w:3, when:(s,L,se) => se === 1 && ["llano","bigspring"].includes(L.id), title:"The playas are dry",
    text:"The shallow lakes your scouts counted on have cracked into mud. The horses are restless and the children thirsty.",
    choices:[
      { label:"Read the land yourself", sub:"Find water by the signs", votes:{ elder:1 }, fx:async s => readTheLand(s) },
      { label:"Ask Owl Feather", sub:"He knows a hidden spring", votes:{ elder:1, peace:1 }, trait:{ wise:1 }, fx:s => { if (!s.elderAlive) return "You wish he were here."; s.harmony += 6; return "Two days' ride to a spring in a draw, exactly where he said. The young men look at the old man differently now."; } },
      { label:"Push on and hope", votes:{ war:1, elder:-1 }, fx:s => { const n = randi(15, 40); s.horses -= n; return `You find water at last, but ${n} horses have died on the way.${hurtMount(s, "runner", 25)}`; } }
    ],
    note:"The Llano Estacado has few permanent water sources. Comanche knowledge of its springs and playa lakes let them cross country that outsiders feared." },

  { id:"lost-child", w:2, when:(s,L) => ["llano","bigspring","red"].includes(L.id), title:"A child is missing",
    text:"A little girl wandered off after a puppy this afternoon. The grass is taller than she is, and the sun is going down.",
    choices:[
      { label:"Track her yourself", sub:"Read the ground", votes:{ camp:1, elder:1 }, trait:{ wise:1 }, fx:async s => { const r = await readTheLand(s, "child"); return r; } },
      { label:"Send every rider out in lines", votes:{ war:1, camp:1 }, fx:s => chance(.8) ? "A rider finds her at midnight, asleep with the puppy in a buffalo wallow." : (lose(s, 1), "They search for three days. She is never found. The camp mourns.") }
    ],
    note:"Comanche children learned the land early, and good trackers could read the slightest sign in grass and soil." },

  /* ---------------- Food from the land ---------------- */
  { id:"plums", w:3, when:(s,L,se) => se === 1 && L.plums, title:"Plum thickets",
    text:"The wild plum thickets along the river are heavy with fruit. Walks Quiet wants every woman and child out picking.",
    choices:[
      { label:"Spend days gathering", votes:{ camp:1, elder:1 }, fx:s => { s.food += 70; return "Baskets of plums, eaten fresh and dried into cakes for winter. 70 food."; } },
      { label:"No time", votes:{ camp:-1 }, fx:() => "The plums fall and rot." }
    ],
    note:"Comanche diets included wild plums, grapes, berries, and roots gathered by women, which mattered far more than outsiders usually noticed." },
  { id:"pecans", w:3, when:(s,L,se) => se === 2 && L.pecans, title:"Pecans",
    text:"The pecan groves along the river are dropping nuts. The children are already throwing sticks into the branches.",
    choices:[{ label:"Gather them", votes:{ camp:1 }, fx:s => { const n = Math.round(60 * (bandOf().mods.pecans || 1)); s.food += n; return `Sacks of pecans, rich and filling. ${n} food.`; } }],
    note:"Pecans from the river bottoms of central Texas were an important fall food for the Penateka Comanche." },
  { id:"mesquite", w:3, when:(s,L,se) => se === 1 && L.mesquite, title:"Mesquite beans",
    text:"The mesquite pods have turned yellow and sweet.",
    choices:[{ label:"Gather and pound them into meal", votes:{ camp:1, elder:1 }, fx:s => { s.food += 50; return "Mesquite meal for flat cakes. 50 food."; } }],
    note:"Mesquite beans were pounded into a sweet meal across the southern plains and the Southwest." },
  { id:"antelope", w:2, when:(s,L,se) => ["llano","bigspring"].includes(L.id) && !s.herdHere, title:"Antelope",
    text:"No buffalo, but scouts have seen a large band of antelope out on the flats.",
    choices:[
      { label:"Surround them", sub:"A whole-camp drive", votes:{ war:1, camp:1 }, fx:s => { s.food += 55; return "Riders circle wide and close in. Antelope meat for every lodge. 55 food."; } },
      { label:"Leave them", fx:() => "The antelope drift over the horizon." }
    ],
    note:"When buffalo were scarce, Comanches hunted antelope, deer, elk, and bear, often with mounted surrounds." },

  /* ---------------- Camp & horses ---------------- */
  { id:"mustangs", w:2, when:(s,L,se) => se <= 2 && ["llano","red","bigspring"].includes(L.id), title:"A wild herd",
    text:"A band of mustangs is watering in a draw not far from camp. Fine animals, a gray stallion leading them.",
    choices:[
      { label:"Send the young men", votes:{ war:1, elder:1 }, trait:{ brave:1 }, fx:s => { const n = randi(10, 30); s.horses += n; return `${n} wild horses roped and brought in.`; } },
      { label:"Leave them be", fx:() => "The gray stallion takes his herd away over the rise." }
    ],
    note:"Wild horse herds roamed the southern plains. Comanches caught and trained mustangs and became some of the finest horse breeders on the continent." },

  { id:"wolves", w:2, repeat:true, when:() => true, title:"Wolves at the horse herd",
    text:"In the night, wolves slip in among the horses. The boys on herd duty are yelling and swinging ropes in the dark.",
    choices:[
      { label:"Send men to help", votes:{ war:1, camp:1 }, fx:s => { const n = randi(1, 5); s.horses -= n; return `The wolves are driven off. Only ${n} foals are lost.`; } },
      { label:"Trust the boys", votes:{ elder:1 }, fx:s => chance(.5) ? (s.son.brave = true, "The boys handle it, Little Hawk in the middle of it. They will tell this story for years.") : (s.horses -= 12, "The boys do their best, but twelve horses scatter and are never found.") }
    ],
    note:"Large horse herds needed constant guarding, often by boys, who learned their horsemanship this way." },

  { id:"lame", w:2, when:s => s.mounts.runner.alive && s.mounts.runner.health < 80, title:() => `${mountName("runner")} is limping`,
    text:() => `Your buffalo runner ${mountName("runner")} came in favoring his left foreleg. He has carried you through every hunt this year.`,
    choices:[
      { label:"Rest him a full moon", sub:"He heals, but you hunt on a lesser horse", votes:{ elder:1, camp:1 }, trait:{ wise:1 }, fx:s => { s.mounts.runner.health = 100; s.flags.runnerResting = s.moon + 1; return `${mountName("runner")} goes out to the best grass. Next hunt, you ride a slower horse.`; } },
      { label:"Keep riding him", votes:{ war:1 }, fx:s => { s.mounts.runner.health -= 25; return `${mountName("runner")} keeps going. He would run for you on three legs.${s.mounts.runner.health <= 0 ? "" : ""}`; } }
    ],
    note:"A great buffalo runner was a hunter's most valuable possession, trained for years to run close beside a stampeding bull." },

  { id:"baby", w:2, when:s => !s.flags.baby, title:"A birth",
    text:"A baby is born in the lodge of one of your cousins, a boy, loud and healthy. They ask you to give him his first name.",
    choices:[
      { label:"Name him for the morning", votes:{ camp:1, elder:1 }, fx:s => { s.people += 1; s.flags.baby = true; s.harmony += 4; return "You hold him up at sunrise and give him his name. He will take another when he is grown."; } }
    ],
    note:"Comanche children were often named by a respected relative or elder, and many took new names later in life through deeds." },

  { id:"gathering", w:4, when:(s,L,se) => se === 1 && ["wichita","red","paloduro"].includes(L.id), title:"Summer gathering",
    text:"Other bands are arriving. Lodges spread along the creek for a mile. There will be races, trading, marriages, and news from every direction.",
    choices:[
      { label:"Race Red Paint", sub:"Bet horses on a race", votes:{ war:1 }, trait:{ brave:1 }, fx:async s => { s.food -= 30; s.harmony += 6; return await horseRace(s); } },
      { label:"Join the gathering", sub:"Costs 30 food", votes:{ peace:1, war:1, elder:1, camp:1 }, fx:s => { s.food -= 30; s.harmony += 10; s.goods += 2; return "A week of visiting. You trade, hear news from the north, and the council has never been closer."; } },
      { label:"Keep to yourselves", votes:{ peace:-1, camp:-1 }, fx:s => { s.harmony -= 5; return "You camp apart. Some of the young people are disappointed."; } }
    ],
    note:"Bands that spent most of the year apart came together in summer to hunt, trade, arrange marriages, race horses, and share news." },

  { id:"sickness", w:1, when:(s,L) => ["torrey","timbers"].includes(L.id), title:"Sickness after the trading",
    text:"A few days after the traders leave, people begin to burn with fever. The old ones remember what sickness from outsiders can do.",
    choices:[
      { label:"Break into small camps", sub:"Spread out to slow it", votes:{ elder:1, camp:1 }, trait:{ wise:1 }, fx:s => { const d = lose(s, randi(2, 6)); s.harmony -= 3; return `Spreading out slows the fever. ${d} people die.`; } },
      { label:"Stay together and care for the sick", votes:{ peace:1 }, fx:s => { const d = lose(s, randi(5, 14)); return `The camp nurses its sick together. ${d} people die.`; } }
    ],
    note:"Epidemics struck the Comanche hard: smallpox in 1780–81 and again in 1816, and cholera carried by gold-rush travelers in 1849." },

  { id:"leaving", w:6, repeat:true, when:s => s.harmony < 42, title:"A family talks of leaving",
    text:"An uncle and his relatives, eleven lodges in all, say they are tired of how things are going. They are thinking of joining another band.",
    choices:[
      { label:"Give them gifts", sub:"6 goods and 15 horses", votes:{ peace:1, elder:1 }, trait:{ generous:2 }, fx:s => { if (s.goods < 6 || s.horses < 30) { s.people -= 22; return "You have too little to give. They pack their lodges and go."; } s.goods -= 6; s.horses -= 15; s.harmony += 14; return "Your generosity is remembered. They stay."; } },
      { label:"Let them go", votes:{ war:1, peace:-1 }, fx:s => { s.people -= 22; s.horses -= 40; s.harmony += 4; return "Eleven lodges ride away with their horses."; } }
    ],
    note:"Comanche bands were fluid. A family unhappy with its leaders could move to another band, so leaders kept people through generosity and good judgment, not command." }
];

/* =======================================================================
   STORY ARCS: fire when their moment comes, ahead of random events.
   ======================================================================= */
const ARCS = [
  /* ---- Morning Grass and her suitors ---- */
  { id:"suitor", when:s => s.moon >= 3 && s.moon <= 7 && s.daughter.status === "single", title:"Horses at the lodge door",
    text:"At dawn there are ten fine horses tied outside your lodge. They belong to Yellow Fox, a rich man's son, older, with a sharp temper. It is a marriage offer for Morning Grass. She has gone very quiet. Walks Quiet says she has been meeting Lone Elk, a poor young man with three horses and a good laugh.",
    choices:[
      { label:"Accept Yellow Fox's horses", sub:"+10 horses now", votes:{ war:1, camp:-1 }, fx:s => { s.horses += 10; s.daughter.status = "promised"; return "You lead the horses into your herd. The marriage is agreed. Morning Grass does not speak to you all day."; }, chain:[["elope", 1, 2]] },
      { label:"Ask Morning Grass what she wants", votes:{ camp:1, elder:1, peace:1 }, trait:{ wise:1 }, fx:s => { s.daughter.status = "married"; s.daughter.husband = "Lone Elk"; s.harmony += 6; s.people += 1; return "She chooses Lone Elk. Yellow Fox takes his horses back, insulted. Lone Elk moves into a lodge beside yours and brings you the first meat of every hunt."; } },
      { label:"Turn both away for now", votes:{ peace:1 }, fx:s => { s.daughter.status = "waiting"; return "You send the horses back politely. Morning Grass is relieved, and impatient."; } }
    ],
    note:"A suitor offered horses to the young woman's family, often through a go-between. Families had the strongest say, but elopement was common, and couples who ran off were usually accepted once the families settled things with gifts." },
  { id:"elope", chainOnly:true, when:s => s.daughter.status === "promised", title:"Morning Grass is gone",
    text:"Morning Grass and Lone Elk ran off together in the night. Yellow Fox is in front of your lodge, shouting. By custom, he can demand payment from Lone Elk's family, or take it himself.",
    choices:[
      { label:"Pay Yellow Fox yourself", sub:"Return his horses and 15 more", votes:{ peace:1, camp:1 }, trait:{ generous:1, peace:1 }, fx:s => { s.horses -= 25; s.daughter.status = "married"; s.daughter.husband = "Lone Elk"; return "You settle it with horses. Yellow Fox is satisfied. Your daughter comes home married, and a little afraid of you. You hug her anyway."; } },
      { label:"Let the young men's families sort it out", votes:{ war:1 }, fx:s => { s.daughter.status = "married"; s.daughter.husband = "Lone Elk"; s.harmony -= 8; return "Yellow Fox raids Lone Elk's family's horses. The camp splits into sides for a moon."; } }
    ],
    note:"Elopement was one of the most common ways Comanche marriages began. A wronged suitor or husband had the right to compensation, which was usually settled in horses." },

  /* ---- Little Hawk's first hunt ---- (handled in the hunt flow; naming follows) */
  { id:"son-name", when:s => s.son.firstKill && !s.son.newName && s.moon >= s.son.firstKillMoon + 1, title:"A giveaway for your son",
    text:"Little Hawk has made his first kill. By custom, a father honors that with a feast and a giveaway: food and horses to those who have less, so the whole camp knows his son is a man.",
    choices:[
      { label:"Hold a great giveaway", sub:"60 food, 25 horses, 4 goods", votes:{ peace:1, elder:1, camp:1, war:1 }, trait:{ generous:2 },
        fx:s => { s.food -= 60; s.horses -= 25; s.goods = Math.max(0, s.goods - 4); s.son.newName = "Runs With Buffalo"; s.harmony += 12; return "The camp feasts. Owl Feather stands and gives your son his new name: Runs With Buffalo. The young men shout it until the dogs bark."; } },
      { label:"A small family meal", votes:{ elder:-1 }, fx:s => { s.son.newName = "Runs With Buffalo"; s.food -= 15; return "A quiet meal. Your son gets his new name, Runs With Buffalo, but people notice there was no giveaway."; } },
      { label:"Not yet", fx:() => "You put it off. Your son says nothing. He doesn't need to." }
    ],
    note:"Giveaways marked important moments: a first kill, a naming, a marriage, a death. Generosity was the measure of a family's standing." },

  /* ---- Rides Ahead ---- */
  { id:"war-defiant", when:s => s.loyal.war <= 30 && !s.flags.defiant, title:"Rides Ahead goes his own way",
    text:"Rides Ahead says you have become an old woman. He is taking twenty young men south to raid the Texan farms, with or without your blessing.",
    choices:[
      { label:"Let him go", votes:{ peace:-1 }, fx:s => { s.flags.defiant = true; s.horses += 30; s.standing -= 20; s.heat += 2; s.loyal.war = 45; return "They come back a moon later with horses and scalps, and Rangers somewhere behind them."; }, chain:[["rangers-follow", 1, 2]] },
      { label:"Give him a gift and a seat at your fire", sub:"12 horses, 3 goods", votes:{ peace:1, war:1 }, trait:{ generous:1, wise:1 }, fx:s => { s.flags.defiant = true; s.horses -= 12; s.goods = Math.max(0, s.goods - 3); s.loyal.war = 65; return "He takes the gift. He stays. For now, he speaks for you, not against you."; } },
      { label:"Shame him in front of the camp", votes:{ elder:1, war:-1 }, fx:s => { s.flags.defiant = true; s.people -= 18; s.horses -= 50; s.loyal.war = 50; return "Rides Ahead leaves with six lodges and their horses. The camp is smaller, and quieter."; } }
    ],
    note:"Any man could organize a raid if others would follow him. A leader who ignored his warriors could lose them, and their families, to another band." },
  { id:"rangers-follow", chainOnly:true, when:() => true, title:"The trail leads to you",
    text:"Rides Ahead's raid left a trail even a Texan could follow. A company of Rangers is two days behind.",
    choices:[
      { label:"Move fast and far", votes:{ elder:1 }, fx:s => { const n = Math.round(s.horses * .07); s.horses -= n; s.heat = 0; return `You ride hard for three days. ${n} horses break down. The Rangers lose the trail.`; } },
      { label:"Ambush them", votes:{ war:1 }, trait:{ brave:1 }, fx:s => { const d = lose(s, randi(2, 7)); s.standing -= 10; return `A running fight across the prairie. ${d} of your people are killed.${hurtMount(s, "war", 40)}`; } }
    ],
    note:"Ranger companies followed raiding trails for days. Raids and reprisals fed each other in a cycle that neither side could stop." },
  { id:"war-glory", when:s => s.loyal.war >= 80 && s.moon >= 4 && !s.flags.glory, title:"Rides Ahead's coup",
    text:"Rides Ahead came back from scouting with a Pawnee war shield, taken by touching an armed enemy and riding away untouched. He wants to recount the deed at your fire.",
    choices:[
      { label:"Honor him with a feast", sub:"30 food", votes:{ war:1, peace:1 }, trait:{ generous:1 }, fx:s => { s.flags.glory = true; s.food -= 30; s.harmony += 10; return "He tells the story three times, a little bigger each time. The young men will follow you through anything now."; } }
    ],
    note:"Counting coup, touching an enemy and escaping, was among the highest honors a Plains warrior could earn, ranking above killing." },

  /* ---- The boy from the south ---- */
  { id:"ransom", when:s => s.flags.captive && !s.flags.ransomAsked && ["canadian","llano"].includes(s.loc), title:"An offer for the boy",
    text:"A Comanchero recognizes the boy from the south. His family in Chihuahua is offering a ransom of cloth, iron, and bread. Walks Quiet has been raising him as her own.",
    choices:[
      { label:"Let the boy decide", votes:{ peace:1, elder:1 }, trait:{ wise:1 }, fx:s => { s.flags.ransomAsked = true; if (chance(.5)) { s.flags.captiveLeft = true; s.goods += 8; s.harmony -= 4; return "He looks at Walks Quiet for a long time. Then he climbs onto the cart. She doesn't cry until he is out of sight."; } s.harmony += 6; return "He stands behind Walks Quiet and says, in Comanche, \"I am home.\" The Comanchero rides away."; } },
      { label:"Accept the ransom", votes:{ camp:-1 }, fx:s => { s.flags.ransomAsked = true; s.flags.captiveLeft = true; s.goods += 8; s.food += 60; return "He goes back south with the carts. Walks Quiet does not speak to you for days."; } },
      { label:"Refuse. He is family now", votes:{ camp:1 }, fx:s => { s.flags.ransomAsked = true; return "You send the Comanchero away. The boy stays."; } }
    ],
    note:"Comancheros and officials ransomed captives back to Mexican and Texan families. Some captives had been adopted and fully became Comanche, and refused to leave. Others were held in hard servitude. Experiences varied widely." },

  /* ---- Owl Feather's last winter ---- */
  { id:"elder-stories", when:(s,L,se) => se === 3 && s.elderAlive && !s.flags.stories, title:"Owl Feather's stories",
    text:"Deep winter. The old man calls the children into your lodge and tells them where every spring on the Llano is, which canyons stay warm, and how the people came south from the mountains long ago. He tells it twice, slowly. He has never done that before.",
    choices:[{ label:"Listen with them", votes:{ elder:1 }, trait:{ wise:2 }, fx:s => { s.flags.stories = true; s.harmony += 6; return "You listen the way you didn't when you were young. Your son repeats the names of the springs under his breath."; } }],
    note:"Knowledge of the land, its water, and the people's history lived in memory and was passed down by telling, especially in winter." },
  { id:"elder-passing", when:(s,L,se) => s.moon >= 10 && s.elderAlive && s.flags.stories && (s.food < s.people || L.exposed || chance(.5)), title:"Owl Feather",
    text:"Your father died in the night, quietly, with his pipe beside him. Walks Quiet has already cut her hair. The women's wailing carries across the whole camp.",
    choices:[
      { label:"Mourn him the old way", sub:"Give away his things. His best horses go with him.", votes:{ camp:1, peace:1 }, trait:{ generous:1 },
        fx:s => { s.elderAlive = false; s.flags.elderDied = true; s.horses -= 12; s.harmony += 6; return "He is buried in the rocks above camp, wrapped in his best robe. His favorite horses are killed so he will ride in the next world. His lodge and everything in it is given away. From now on, his name is not spoken."; } }
    ],
    note:"Comanche mourners cut their hair and sometimes gashed their arms. A man's possessions were given away or destroyed, his favorite horses were often killed at the grave, and his name was no longer spoken." }
];

/* Scripted historical beat: Texas annexation (December 1845) */
const ANNEX = { id:"annex", title:"News from the east", text:"Riders bring word: the Texans have joined the Americans. The Republic that made treaties with you at Tehuacana Creek is gone, folded into the United States.",
  choices:[{ label:"Hear the council", fx:() => "Gray Leggings: “Then the Americans’ promises are now the Texans’ promises.” Owl Feather: “Or the Texans’ promises are now no one’s.”" }],
  note:"The United States annexed Texas on December 29, 1845. Texas kept control of its public lands, so the federal government could not guarantee Comanche land there. The 1846 Council Springs treaty followed with no boundary at all." };

/* Leader naming (reputation) */
const NAMING = { id:"naming", title:"The camp gives you a new name",
  text:s => { const t = topTrait(s); return `At the fire tonight, Gray Leggings stands and speaks about you. ${TRAITS[t].line} He says a man should carry a name that tells the truth about him, and he gives you one: ${s.earnedName}.`; },
  choices:[{ label:"Accept the name", votes:{ peace:1, elder:1 }, fx:s => `From now on, people call you ${s.earnedName}.` }],
  note:"Comanche men often received new names as adults, given in recognition of a deed or a quality the community saw in them." };
