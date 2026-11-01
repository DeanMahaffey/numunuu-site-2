"use strict";
/* =======================================================================
   WORLD DATA
   Seasons index: 0 spring, 1 summer, 2 fall, 3 winter.
   grass: 0 none .. 3 rich.  herd: chance buffalo are near, by season.
   `word` fields are left null on purpose: fill them from the dictionary
   (dictionary.numunuu.com) once spellings are verified.
   ======================================================================= */
const SEASONS = ["Spring","Summer","Fall","Winter"];
const MONTHS = ["March","April","May","June","July","August","September","October","November","December","January","February"];
const seasonOf = m => Math.floor(Math.min(m, 11) / 3);
const yearOf = m => m >= 10 ? 1846 : 1845;
const MAX_MOONS = 12;
const REACH = 330;

const LOCS = {
  wichita:  { name:"Wichita Mountains", sub:"Granite peaks above the Red River country", x:730, y:310, biome:"granite", shelter:true,
              grass:[3,2,2,1], herd:[.55,.4,.55,.45], word:null,
              desc:"Old granite domes, clear creeks, and timber for winter fires. A place bands return to again and again." },
  red:      { name:"Pease River", sub:"Red River country", x:610, y:368, biome:"river", grass:[3,2,2,1], herd:[.75,.55,.75,.6], mustang:true, plums:true, word:null,
              desc:"Wide sandy river, cottonwood groves, and some of the best buffalo range on the southern plains." },
  paloduro: { name:"Palo Duro Canyon", sub:"Prairie Dog Town Fork of the Red", x:430, y:298, biome:"canyon", shelter:true,
              grass:[2,2,2,2], herd:[.4,.3,.55,.65], plums:true, word:null,
              desc:"A great red canyon cut into the edge of the Llano. Water, wood, and shelter from the north wind. A favored winter camp." },
  llano:    { name:"Llano Estacado", sub:"The Staked Plains", x:330, y:420, biome:"llano", exposed:true, grass:[2,3,2,0], herd:[.6,.9,.6,.1], mustang:true, word:null,
              desc:"A flat ocean of grass. Summer herds darken it from edge to edge. Water hides in springs and playa lakes only the knowing can find." },
  canadian: { name:"Canadian River Breaks", sub:"Comanchero trading grounds", x:250, y:268, biome:"mesa", trade:"comanchero", grass:[2,2,2,1], herd:[.4,.5,.5,.3], word:null,
              desc:"Broken mesas along the Canadian. New Mexican carts come out here to trade bread and iron for robes and horses." },
  timbers:  { name:"Big Timbers", sub:"Arkansas River", x:330, y:42, biome:"river", shelter:true, trade:"bent", grass:[2,3,2,1], herd:[.5,.8,.5,.15], word:null,
              desc:"Cottonwood groves along the Arkansas, the northern edge of the Comanchería. Bent's traders work this stretch of river, and the Cheyenne are near." },
  bigspring:{ name:"Big Spring", sub:"Headwaters of the Colorado", x:450, y:530, biome:"plains", grass:[2,2,2,1], herd:[.5,.5,.6,.5], mexico:true, mesquite:true, word:null,
              desc:"A reliable spring at the foot of the caprock, and the start of the great war trail south into Mexico." },
  sansaba:  { name:"San Saba River", sub:"Edge of the Texas frontier", x:690, y:622, biome:"hill", grass:[3,2,2,2], herd:[.4,.3,.5,.6], mexico:true, texasRaid:true, pecans:true, word:null,
              desc:"Live oak hills, pecan groves, and clear rivers. Penateka country. Texan surveyors and settlers are getting closer every season." },
  torrey:   { name:"Torrey's Trading House", sub:"Tehuacana Creek, Brazos River", x:880, y:584, biome:"hill", trade:"torrey", council:true, pecans:true,
              grass:[2,2,2,1], herd:[.1,.1,.1,.1], word:null,
              desc:"The Republic of Texas trading house near Waco. Commissioners hold councils here and hand out gifts to keep the peace." }
};
for (const [id, L] of Object.entries(LOCS)) L.id = id;
const dist = (a, b) => Math.hypot(LOCS[a].x - LOCS[b].x, LOCS[a].y - LOCS[b].y);

/* =======================================================================
   PEOPLE
   The council sits at your fire. Names are English renderings, the way
   treaty clerks wrote them; Comanche forms can be added later.
   ======================================================================= */
const ADVISORS = [
  { id:"peace", name:"Gray Leggings", role:"Peace Chief", hair:"#2b211b",
    bio:"Slow to speak. He has kept this band out of needless wars for twenty winters, and the families trust him for it." },
  { id:"war",   name:"Rides Ahead", role:"War Leader", hair:"#1e1713", feather:true,
    bio:"Young, proud, and hungry for honors. The young men follow him. If you don't give him a path, he may make one." },
  { id:"elder", name:"Owl Feather", role:"Elder · your father", hair:"#bdb5a8",
    bio:"Your father. He has crossed the Llano more times than anyone alive, and he knows where the water hides." },
  { id:"camp",  name:"Walks Quiet", role:"Camp Keeper · your wife", hair:"#241b16", shawl:true,
    bio:"Your wife. She runs the lodges and the hide work. The robes that buy iron and cloth pass through her hands." }
];
const ADV = Object.fromEntries(ADVISORS.map(a => [a.id, a]));

function faceSVG(a, size = 38){
  const skin = "#8a5a3c";
  const bg = { war:"#4a2a20", elder:"#3a3440", camp:"#3d3322", peace:"#2b3a33" }[a.id] || "#333";
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">
    <rect width="40" height="40" fill="${bg}"/>
    <path d="M6 40c1-9 7-13 14-13s13 4 14 13z" fill="${a.shawl ? "#9e4a2c" : "#6b4a32"}"/>
    ${a.shawl ? '<path d="M8 40c3-6 7-9 12-9s9 3 12 9" fill="none" stroke="#e3b766" stroke-width="1.4"/>' : ''}
    <ellipse cx="20" cy="17" rx="7.5" ry="8.5" fill="${skin}"/>
    <path d="M12 17c0-7 3.5-10 8-10s8 3 8 10c-1-3-3-5-8-5s-7 2-8 5z" fill="${a.hair}"/>
    <path d="M12.5 15c-1.5 6-1 11 0 15M27.5 15c1.5 6 1 11 0 15" stroke="${a.hair}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${a.feather ? '<path d="M25 8l7-7" stroke="#f1e6d2" stroke-width="2.4" stroke-linecap="round"/><path d="M30.5 2.5l1.5-1.5" stroke="#2a1d16" stroke-width="2.4" stroke-linecap="round"/>' : ''}
    ${a.id === "elder" ? '<path d="M16 21h8" stroke="#5c3b26" stroke-width=".8"/>' : ''}
  </svg>`;
}

const FAMILY = {
  son:      { name:"Little Hawk", about:"Your son, thirteen winters. He has never killed a buffalo, and it is all he thinks about." },
  daughter: { name:"Morning Grass", about:"Your daughter, sixteen winters. Old enough to marry, and she has opinions about who." }
};

/* Named horses. Health affects how they run. */
const MOUNTS = [
  { id:"runner", name:"Smoke", kind:"buffalo runner", coat:"#9a9289", about:"A gray gelding, fast and fearless in the herd. Your best buffalo runner." },
  { id:"war",    name:"Red Paint", kind:"war pony", coat:"#8a4a2c", about:"A red-and-white pinto. Tough, quick to turn, and he loves to race." }
];

/* =======================================================================
   GOALS: chosen at the start of the year
   ======================================================================= */
const GOALS = [
  { id:"trade",  icon:"🦬", name:"The Great Trade", short:"End the year with 40 robes",
    about:"Walks Quiet wants a great pile of robes for the spring trade fairs. Hunt hard in fall and winter, when the hides are thickest.",
    progress:s => `${s.robes} / 40 robes`, done:s => s.robes >= 40 },
  { id:"horses", icon:"🐎", name:"Thunder of Hooves", short:"End the year with 700 horses",
    about:"Horses are wealth. A band with a great herd is a band other families want to join.",
    progress:s => `${s.horses} / 700 horses`, done:s => s.horses >= 700 },
  { id:"lodges", icon:"🔥", name:"No Empty Lodges", short:"Lose fewer than 6 people all year",
    about:"Keep everyone alive. Find food before hunger comes, shelter before the northers, and avoid needless fights.",
    progress:s => `${s.deaths} lost (limit 5)`, done:s => s.deaths < 6 },
  { id:"son",    icon:"🪶", name:"A Name for My Son", short:"Little Hawk earns his grown name",
    about:"Your son is ready to become a man. Let him ride in the hunt, then honor him with a giveaway feast.",
    progress:s => s.son.newName ? `Named ${s.son.newName}` : s.son.firstKill ? "First kill made. Now a feast." : "No kill yet", done:s => !!s.son.newName }
];

/* =======================================================================
   EVERY PART
   ======================================================================= */
const PARTS = [
  { part:"Winter hide (hair on)", use:"Robes and bedding", fact:"Thick winter hides were tanned with the hair left on to make warm robes, the most valuable trade good on the plains." },
  { part:"Summer hide (hair off)", use:"Tipi covers", fact:"A large tipi cover took a dozen or more hides, scraped thin, tanned, and sewn together with sinew." },
  { part:"Sinew", use:"Bowstrings and thread", fact:"Back sinew was dried and split into fibers, strong enough for bowstrings and for sewing hides." },
  { part:"Brains", use:"Tanning the hide", fact:"Brains were worked into the hide to soften it. It is said each animal has just enough brains to tan its own hide." },
  { part:"Horns", use:"Cups and spoons", fact:"Horns were boiled soft, shaped, and dried into cups, ladles, and spoons, or used as powder horns." },
  { part:"Bones", use:"Scrapers and tools", fact:"Leg bones made fleshing tools for hides; ribs and shoulder blades became scrapers and hoes." },
  { part:"Stomach", use:"Water bag and cooking pot", fact:"A cleaned paunch carried water, and could be hung and filled with hot stones to boil food." },
  { part:"Dried dung", use:"Fuel for fires", fact:"On the treeless plains, dried buffalo chips were the everyday cooking fuel." },
  { part:"Meat", use:"Dried meat and pemmican", fact:"Meat was sliced thin and sun-dried, then pounded with fat and berries into pemmican that kept through winter." },
  { part:"Hooves", use:"Glue and rattles", fact:"Hooves were boiled into glue for arrows and bows, or dried to make rattles." },
  { part:"Tail", use:"Fly swatter and ornament", fact:"A tail on a stick made a fly swatter, and tails decorated lodges and clothing." },
  { part:"Hair", use:"Rope and padding", fact:"Buffalo hair was braided into ropes and halters and used to pad saddles." }
].map(p => ({ ...p, word:null }));

/* =======================================================================
   REPUTATION → EARNED NAMES
   Comanche men could take new names through deeds; the camp gives them.
   ======================================================================= */
const TRAITS = {
  generous:{ label:"Generous", names:["Gives Away Horses","Many Robes Given"], line:"You give before you are asked. Families from other bands talk about it." },
  brave:   { label:"Brave",    names:["Rides Into Them","Charges the Herd"], line:"You ride first and turn back last. The young men would follow you anywhere." },
  wise:    { label:"Wise",     names:["Knows the Water","Sees the Weather"], line:"You listen before you speak, and your choices keep people alive." },
  peace:   { label:"Peacemaker", names:["Talks Them Down","Holds the Pipe"], line:"Traders and strangers alike trust your word. Your camp sleeps without fear." }
};

/* =======================================================================
   CAMP LIFE: one small scene per moon, shown in the moon report
   ======================================================================= */
const VIGNETTES = [
  { id:"v-race", when:s => !s.son.firstKill, text:"Little Hawk spent all day racing ponies with the other boys. He lost every race and is already planning his revenge." },
  { id:"v-hides", when:s => s.robes >= 10, text:"Walks Quiet has hides staked out in the sun all over camp. Nobody walks near them. Nobody." },
  { id:"v-dogs", when:s => s.elderAlive, text:"Owl Feather told the children about the old days, before horses, when dogs pulled the travois and a camp moved only a few miles a day. They didn't believe him." },
  { id:"v-spring", when:(s,se) => se === 0, text:"New grass everywhere. The horses roll in it like colts, legs in the air." },
  { id:"v-summer", when:(s,se) => se === 1, text:"Too hot to do anything at midday. Half the camp is in the river, the other half is asleep in the shade of the lodges with the covers rolled up." },
  { id:"v-fall", when:(s,se) => se === 2, text:"Racks of drying meat everywhere you look. The whole camp smells like a feast." },
  { id:"v-winter", when:(s,se) => se === 3, text:"Snow on the lodge covers. Inside: fire, smoke, dried meat, and a long argument about whose turn it is to fetch water." },
  { id:"v-moccasins", when:s => s.daughter.status === "single", text:"Morning Grass beaded a pair of moccasins. She won't say who they are for. Her mother has guesses." },
  { id:"v-smoke", when:s => s.mounts.runner.alive, text:"You spent the evening rubbing down Smoke. He leaned his head on your shoulder like he knew what tomorrow would ask of him." },
  { id:"v-paint", when:s => s.mounts.war.alive, text:"Red Paint broke out of the herd again and was found grazing next to your lodge, very pleased with himself." },
  { id:"v-hungry", when:s => s.food < s.people * .8, text:"Thin soup and boiled rawhide tonight. The children don't complain, which is worse." },
  { id:"v-rich", when:s => s.horses >= 520, text:"The horse herd covers the whole valley now. Boys ride out at dawn just to look at it." },
  { id:"v-low", when:s => s.harmony < 45, text:"Low voices at the fires tonight. People are noticing who sits with whom." },
  { id:"v-kiowa", when:s => s.flags.kiowa, text:"Kiowa and Comanche boys ran a footrace at dawn. Both sides say they won. It may come to blows." },
  { id:"v-heat", when:s => s.heat > 0, text:"The horse guards doubled tonight. Nobody says why. Everyone knows why." },
  { id:"v-captive", when:s => s.flags.captive && !s.flags.captiveLeft, text:"The boy from the south said his first Comanche words today. The children laughed, then taught him five more." },
  { id:"v-captive2", when:s => s.flags.captive && !s.flags.captiveLeft && s.moon >= (s.flags.captiveMoon || 0) + 3, text:"The boy from the south calls Walks Quiet \"mother\" now. She pretends not to notice. She noticed." },
  { id:"v-mourning", when:s => s.flags.elderDied, text:"No one speaks his name now. That is the custom. But the children still ask for the stories, and you tell them as well as you can." },
  { id:"v-named", when:s => !!s.son.newName, text:() => `Your son answers to ${S.son.newName} now. He still turns around when someone shouts "Little Hawk," then pretends he didn't.` },
  { id:"v-married", when:s => s.daughter.status === "married", text:"Morning Grass's new lodge stands next to yours. Her husband brings meat to your door every few days, as a son-in-law should." },
  { id:"v-baby", when:s => s.flags.baby, text:"The new baby screams through the night. Everyone in camp agrees it has strong lungs. Some agree more politely than others." },
  { id:"v-gambling", when:s => s.goods >= 8, text:"A hand game went on until dawn: drumming, singing, and someone lost a good knife and two blankets." },
  { id:"v-stars", when:(s,se) => se !== 3, text:"A clear night. Owl Feather points out the stars the old people used to find their way across the Llano." },
  { id:"v-ridesahead", when:s => s.loyal.war >= 70, text:"Rides Ahead painted his horse and paraded through camp. The young men cheered. He looked at you and nodded." },
  { id:"v-ridesahead2", when:s => s.loyal.war < 40, text:"Rides Ahead sat at another man's fire tonight, with the young men around him. Your wife saw it too." },
  { id:"v-graylegs", when:s => s.loyal.peace >= 70, text:"Gray Leggings smoked with you after dark and said almost nothing. From him, that is high praise." },
  { id:"v-plenty", when:s => s.food > s.people * 3, text:"So much meat that Walks Quiet is giving it away to the poorer lodges. A generous camp is a strong camp." },
  { id:"v-dance", when:(s,se) => se === 1, text:"Drums after sundown. The young people danced late, and the old people pretended not to watch who danced with whom." }
];
