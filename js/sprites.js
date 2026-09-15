// ---------------------------------------------------------------------------
// sprites.js - pixel art data. Each sprite is an array of row strings, or an
// object {frames:[rows,...], pal:{...}}. Characters map to PAL in gfx.js.
// Player characters face RIGHT, enemies face LEFT.
// ---------------------------------------------------------------------------
'use strict';

const SPRITES = {};

// ===================== HERO: ONGA (16x24) ==================================
// wild hair, bone guitar "Rock-Axe", spotted tunic
SPRITES.onga = { frames: [
[
'....hhhhhh......',
'...hhhhhhhh.....',
'..hhhhhhhhhh....',
'..hhsssssshh....',
'..hhs0ss0shh....',
'...hsssssshh....',
'...hsSeessh.....',
'....ssSSss......',
'.....ssss.......',
'....ttttttt.....',
'...tt0tttt0t....',
'..stt0t0tt0ts...',
'..sttttt0ttts...',
'..sttt0tttt.....',
'..s.ttttttt.....',
'....tt0tttt.....',
'....ttttt.......',
'....ss.ss.......',
'....ss.ss.......',
'....ss.ss.......',
'....SS.SS.......',
'...bbb.bbb......',
'...bbb.bbb......',
'................'],
[
'................',
'....hhhhhh......',
'...hhhhhhhh.....',
'..hhhhhhhhhh....',
'..hhsssssshh....',
'..hhs0ss0shh....',
'...hsssssshh....',
'...hsSeessh.....',
'....ssSSss......',
'.....ssss.......',
'....ttttttt.....',
'...tt0tttt0t....',
'..stt0t0tt0ts...',
'..sttttt0ttts...',
'..sttt0tttt.....',
'..s.ttttttt.....',
'....tt0tttt.....',
'....ttttt.......',
'....ss.ss.......',
'....ss.ss.......',
'....SS.SS.......',
'...bbb.bbb......',
'...bbb.bbb......',
'................'],
// strum frame (arm forward)
[
'....hhhhhh......',
'...hhhhhhhh.....',
'..hhhhhhhhhh....',
'..hhsssssshh....',
'..hhs0ss0shh....',
'...hsssssshh....',
'...hsSwwssh.....',
'....ssSSss......',
'.....ssss.......',
'....ttttttt.....',
'...tt0tttt0tss..',
'..stt0t0tt0tss..',
'..sttttt0ttts...',
'..sttt0tttts....',
'....ttttttt.....',
'....tt0tttt.....',
'....ttttt.......',
'....ss.ss.......',
'....ss.ss.......',
'....ss.ss.......',
'....SS.SS.......',
'...bbb.bbb......',
'...bbb.bbb......',
'................'],
// hurt frame
[
'....hhhhhh......',
'...hhhhhhhh.....',
'..hhhhhhhhhh....',
'..hhsssssshh....',
'..hhs>ss<shh....',
'...hsssssshh....',
'...hsSooSsh.....',
'....ssSSss......',
'.....ssss.......',
'....ttttttt.....',
'...tt0tttt0t....',
'.sstt0t0tt0tss..',
'..sttttt0ttts...',
'..sttt0tttt.....',
'....ttttttt.....',
'....tt0tttt.....',
'....ttttt.......',
'....ss.ss.......',
'...ss...ss......',
'...ss...ss......',
'...SS...SS......',
'..bbb...bbb.....',
'..bbb...bbb.....',
'................'],
], pal: { '>': '#16101c', '<': '#16101c' } };

// Bone guitar "Rock-Axe" (24x10) drawn separately so it can be angled/animated
SPRITES.rockaxe = [
'....................nn..',
'..................nnnn..',
'.......BB.......nnnnn...',
'.....BBBBBBBBBBBBBnn....',
'....BBB0BBnnnnnnnnnn....',
'...BBBB0BBBBBBBBBBB.....',
'....BBBBBBB.............',
'.....BBB0B..............',
'......BBB...............',
'........................'];

// ===================== BAND MEMBERS ========================================
// BONGA - drummer (16x22), stocky, bald with beard, log drums
SPRITES.bonga = { frames: [
[
'.....ssssss.....',
'....ssssssss....',
'....ss0ss0ss....',
'....ssssssss....',
'....sHHHHHHs....',
'....HHHHHHHH....',
'.....HHHHHH.....',
'..ssttttttttss..',
'.sssttt0tttttss.',
'.ss.tt0t0ttt.ss.',
'.BB.ttttttt..BB.',
'....ttt0ttt.....',
'....ttttttt.....',
'...bbbbbbbbb....',
'..bbbbbbbbbbb...',
'..bBBBBBBBBBb...',
'..bbbbbbbbbbb...',
'..bbbbbbbbbbb...',
'..bBBBBBBBBBb...',
'..bbbbbbbbbbb...',
'...ss.....ss....',
'...SS.....SS....'],
[
'................',
'.....ssssss.....',
'....ssssssss....',
'....ss0ss0ss....',
'....ssssssss....',
'....sHHHHHHs....',
'....HHHHHHHH....',
'.....HHHHHH.....',
'.BBsttttttttsBB.',
'.sssttt0tttttss.',
'.ss.tt0t0ttt.ss.',
'....ttttttt.....',
'....ttt0ttt.....',
'....ttttttt.....',
'...bbbbbbbbb....',
'..bbbbbbbbbbb...',
'..bBBBBBBBBBb...',
'..bbbbbbbbbbb...',
'..bbbbbbbbbbb...',
'..bBBBBBBBBBb...',
'..bbbbbbbbbbb...',
'...ss.....ss....'],
]};

// UGG - bass player (16x24), tall, big nose, mammoth-gut bass
SPRITES.ugg = { frames: [
[
'....HHHHHH......',
'...HHHHHHHH.....',
'...HHssssHH.....',
'...HHs0s0HH.....',
'...HHssssHH.....',
'....ssSSss......',
'....sssSss......',
'.....ssss.......',
'....gggggg......',
'...ggg0gggg.....',
'..sgg0g0ggg.....',
'..sggggg0gg.....',
'..s.ggg0ggg.....',
'....gggggg......',
'....gggggg......',
'....gggggg......',
'....ss..ss......',
'....ss..ss......',
'....ss..ss......',
'....ss..ss......',
'....ss..ss......',
'....SS..SS......',
'...bbb..bbb.....',
'...bbb..bbb.....'],
[
'................',
'....HHHHHH......',
'...HHHHHHHH.....',
'...HHssssHH.....',
'...HHs0s0HH.....',
'...HHssssHH.....',
'....ssSSss......',
'....sssSss......',
'.....ssss.......',
'....gggggg......',
'...ggg0gggg.....',
'..sgg0g0ggg.....',
'..sggggg0gg.....',
'..s.ggg0ggg.....',
'....gggggg......',
'....gggggg......',
'....ss..ss......',
'....ss..ss......',
'....ss..ss......',
'....ss..ss......',
'....ss..ss......',
'....SS..SS......',
'...bbb..bbb.....',
'...bbb..bbb.....'],
]};

// ZOG - flutist (14x20), skinny, feather in hair, bone flute
SPRITES.zog = { frames: [
[
'.......e......',
'......eee.....',
'....hhhee.....',
'...hhhhhh.....',
'...hssssh.....',
'...hs0s0h.....',
'...hsssss.....',
'....sSsS......',
'.....ss.......',
'....uuuuu.....',
'...uu0uuuu....',
'..suuu0uuus...',
'..suuuuuuus...',
'..s.uu0uuu....',
'....uuuuu.....',
'....uuuuu.....',
'....ss.ss.....',
'....ss.ss.....',
'....SS.SS.....',
'...bbb.bbb....'],
[
'..............',
'.......e......',
'......eee.....',
'....hhhee.....',
'...hhhhhh.....',
'...hssssh.....',
'...hs0s0h.....',
'...hsssss.....',
'....sSsS......',
'.....ss.......',
'....uuuuu.....',
'...uu0uuuu....',
'..suuu0uuus...',
'..suuuuuuus...',
'..s.uu0uuu....',
'....uuuuu.....',
'....ss.ss.....',
'....ss.ss.....',
'....SS.SS.....',
'...bbb.bbb....'],
]};

// PRINCESS PETRA (14x24) - long red hair, bone crown, pink dress
SPRITES.petra = { frames: [
[
'.....nnnn.....',
'....n.nn.n....',
'....eeeeee....',
'...eeeeeeee...',
'...eessssee...',
'...ees0s0ee...',
'...eessssee...',
'...eesSkSee...',
'...ee.ss.ee...',
'...ee.ss.ee...',
'...eekkkkee...',
'...ekkkkkke...',
'..skkk0kkkks..',
'..skkkkk0kks..',
'...kkk0kkkk...',
'...kkkkkkkk...',
'...kkkkkkkk...',
'..kkkkkkkkkk..',
'..kkkkk0kkkk..',
'..kkk0kkkkkk..',
'.kkkkkkkkkkkk.',
'.kkkkkkkkkkkk.',
'...ss....ss...',
'...bb....bb...'],
[
'..............',
'.....nnnn.....',
'....n.nn.n....',
'....eeeeee....',
'...eeeeeeee...',
'...eessssee...',
'...ees0s0ee...',
'...eessssee...',
'...eesSkSee...',
'...ee.ss.ee...',
'...ee.ss.ee...',
'...eekkkkee...',
'...ekkkkkke...',
'..skkk0kkkks..',
'..skkkkk0kks..',
'...kkk0kkkk...',
'...kkkkkkkk...',
'...kkkkkkkk...',
'..kkkkkkkkkk..',
'..kkkkk0kkkk..',
'..kkk0kkkkkk..',
'.kkkkkkkkkkkk.',
'.kkkkkkkkkkkk.',
'...ss....ss...'],
]};

// TRADER OOGA (16x22) shopkeeper with big mustache and feathered hat
SPRITES.trader = [
'......gggg......',
'....gggggggg....',
'...gggeggggg....',
'..ggggggggggg...',
'...ssssssss.....',
'...ss0ss0ss.....',
'...ssssssss.....',
'..HHHHHHHHHH....',
'..HH.ssss.HH....',
'.....ssss.......',
'....vvvvvvv.....',
'...vvvavvvvv....',
'..svvvvvavvvs...',
'..svvavvvvvvs...',
'..s.vvvvavvv....',
'....vvvvvvv.....',
'....vvvvvvv.....',
'....ss..ss......',
'....ss..ss......',
'....SS..SS......',
'...bbb..bbb.....',
'................'];

// SHAMAN (14x22) - old, skull mask, staff
SPRITES.shaman = [
'....nnnnnn....',
'...nnnnnnnn...',
'...nn0nn0nn...',
'...nnnnnnnn...',
'...nn0n0n0n...',
'....nnnnnn....',
'.....3333.....',
'....pppppp....',
'...ppp0pppp...',
'..sppppppppb..',
'..spp0pppppb..',
'..s.pppp0ppb..',
'....pppppp.b..',
'....pppppp.b..',
'....pppppp.b..',
'....pppppp.b..',
'....pppppp.b..',
'....pppppp.b..',
'....ss..ss.b..',
'....SS..SS.b..',
'...bbb..bbb...',
'..............'];

// Cheering tribe folk (small 8x12) for crowd/rally scenes
SPRITES.folk = { frames: [
[
'..hhhh..',
'..ssss..',
'..s0s0..',
'..ssss..',
'.tttttt.',
'sttt0tts',
'..tttt..',
'..tttt..',
'..s..s..',
'..s..s..',
'..b..b..',
'........'],
[
's.hhhh.s',
's.ssss.s',
'..s0s0..',
'..ssss..',
'.tttttt.',
'.ttt0tt.',
'..tttt..',
'..tttt..',
'..s..s..',
'..s..s..',
'..b..b..',
'........'],
]};

// ===================== ENEMIES (face LEFT) =================================
// COMPY - tiny pack dino (16x12)
SPRITES.compy = { frames: [
[
'.....ddd........',
'....dd0dd.......',
'....ddddd.....d.',
'.....nd......dd.',
'.....ddd....dd..',
'....ddlddddddd..',
'...ddlllddddd...',
'...dddlldddd....',
'....dd..dd......',
'....d...d.......',
'...DD..DD.......',
'................'],
[
'................',
'.....ddd........',
'....dd0dd.....d.',
'....ddddd....dd.',
'.....nd.....dd..',
'.....ddd...ddd..',
'....ddlddddddd..',
'...ddlllddddd...',
'...dddlldddd....',
'....dd..dd......',
'...DD..DD.......',
'................'],
]};

// RAPTOR (24x20) - feathered crest, sickle claws
SPRITES.raptor = { frames: [
[
'.....ooo................',
'....dddddo..............',
'...dd0ddddd.............',
'..dddddddddd............',
'..dnndnddddd............',
'.....dddd...............',
'......ddd..............d',
'......dddd............dd',
'.......ddddddd.......dd.',
'.......ddddddddd....dd..',
'......ddlldddddddd.ddd..',
'......ddllddddddddddd...',
'.....ddddlldddddddd.....',
'.....dddddlldddddd......',
'......d.dddddd..........',
'.......ddd.ddd..........',
'.......dd...dd..........',
'......dd....dd..........',
'.....dD.....DD..........',
'....n.D.....D.n.........'],
[
'........................',
'.....ooo................',
'....dddddo..............',
'...dd0ddddd............d',
'..dddddddddd..........dd',
'..dnndnddddd.........dd.',
'.....dddd...........dd..',
'......ddd..........ddd..',
'......dddd........ddd...',
'.......ddddddd...ddd....',
'.......ddddddddddddd....',
'......ddlldddddddddd....',
'......ddllddddddddd.....',
'.....ddddlldddddddd.....',
'.....dddddlldddddd......',
'......d.dddddd..........',
'.......ddd.ddd..........',
'.......dd...dd..........',
'......dD....DD..........',
'.....n.D....D.n.........'],
]};

// DODO (16x16) - fat, big yellow beak
SPRITES.dodo = { frames: [
[
'......rrrr......',
'.....rrrrrr.....',
'..yyyr0rrrrr....',
'.yyyyrrrrrrr....',
'..yy.rrrrrr.....',
'......rrr.......',
'....rrrrrrrr....',
'...rrrrrrrrrrr..',
'..rr3rrrrrrrrrr.',
'..rr33rrrrrrrrr.',
'..rrr33rrrrrrr..',
'...rrrrrrrrrr.r.',
'....rrrrrrrr.rr.',
'......y..y......',
'......y..y......',
'.....yy..yy.....'],
[
'................',
'......rrrr......',
'.....rrrrrr.....',
'..yyyr0rrrrr....',
'.yyyyrrrrrrr....',
'..yy.rrrrrr.....',
'......rrr.......',
'....rrrrrrrr....',
'...rrrrrrrrrrr..',
'..rr3rrrrrrrrrr.',
'..rr33rrrrrrrrr.',
'..rrr33rrrrrrr..',
'...rrrrrrrrrr.r.',
'....rrrrrrrr.rr.',
'......y..y......',
'.....yy..yy.....'],
]};

// CAVE BOAR (24x16)
SPRITES.boar = { frames: [
[
'........BBB.BBB.BB......',
'......BBBBBBBBBBBBBB....',
'....BBbbbbbbbbbbbbbBB...',
'...BBbbbbbbbbbbbbbbbBB..',
'..BB0bbbbbbbbbbbbbbbbBb.',
'..BBbbbbbbbbbbbbbbbbbB..',
'.SBBbbbbbbbbbbbbbbbbB...',
'nBBBbbbbbbbbbbbbbbbB....',
'.nBBBbbbbbbbbbbbbbB.....',
'..BBB.BBBB....BBBB......',
'..BB..BBB.....BBB.......',
'..BB..BB......BB........',
'..BB..BB......BB........',
'..00..00......00........',
'........................',
'........................'],
[
'........................',
'........BBB.BBB.BB......',
'......BBBBBBBBBBBBBB....',
'....BBbbbbbbbbbbbbbBB...',
'...BBbbbbbbbbbbbbbbbBB..',
'..BB0bbbbbbbbbbbbbbbbBb.',
'..BBbbbbbbbbbbbbbbbbbB..',
'.SBBbbbbbbbbbbbbbbbbB...',
'nBBBbbbbbbbbbbbbbbbB....',
'.nBBBbbbbbbbbbbbbbB.....',
'..BBB.BBBB....BBBB......',
'..BB..BBB.....BBB.......',
'..BB..BB......BB........',
'..00..00......00........',
'........................',
'........................'],
]};

// GRUG - rival caveman with club (18x22)
SPRITES.grug = { frames: [
[
'..............BBB.',
'.............BBBBB',
'.....hhhhhh..BBBBB',
'....hhhhhhhh..BBB.',
'....hh0hh0hh..BB..',
'....hhssssshh.BB..',
'.....ss0ss0s..BB..',
'.....sssssss..BB..',
'.....ssSSSss..B...',
'......sssss...B...',
'.....ttttttts.....',
'....ttt0tttts.....',
'...sttttt0ttts....',
'...stt0tttttt.....',
'...s.tttttt0t.....',
'.....ttt0tttt.....',
'.....ttttttt......',
'.....ss...ss......',
'.....ss...ss......',
'.....SS...SS......',
'....bbb...bbb.....',
'..................'],
[
'..................',
'..............BBB.',
'.....hhhhhh..BBBBB',
'....hhhhhhhh.BBBBB',
'....hh0hh0hh..BBB.',
'....hhssssshh.BB..',
'.....ss0ss0s..BB..',
'.....sssssss..BB..',
'.....ssSSSss..BB..',
'......sssss...B...',
'.....ttttttts.B...',
'....ttt0tttts.....',
'...sttttt0ttts....',
'...stt0tttttt.....',
'...s.tttttt0t.....',
'.....ttt0tttt.....',
'.....ttttttt......',
'.....ss...ss......',
'.....ss...ss......',
'.....SS...SS......',
'....bbb...bbb.....',
'..................'],
]};

// SABERTOOTH (28x18) - orange with dark stripes, huge fangs
SPRITES.sabertooth = { frames: [
[
'....oo......................',
'...ooooo....................',
'..oo0oooo...................',
'.oooooooooo.................',
'.oqqooooooo.................',
'.oqqoooooo.oooooooooo.......',
'..nnoooooooooOooooOoooo.....',
'..n.oooooooooooOoooooOooo...',
'..n.ooooooooOooooooooooooo..',
'....ooooooooooOoooOoooooooo.',
'....oooooooooooooooooooooo.o',
'....oooooooooooooooooooo..oo',
'....ooo.ooooooooo..oooo..oo.',
'....ooo.oooo.ooo...ooo..oo..',
'....oo..oo...oo....oo...o...',
'....oo..oo...oo....oo.......',
'...OO..OO...OO....OO........',
'............................'],
[
'............................',
'....oo......................',
'...ooooo....................',
'..oo0oooo...................',
'.oooooooooo.................',
'.oqqooooooo.oooooooooo......',
'.oqqoooooo.ooooooooooooo....',
'..nnoooooooooOooooOoooooo...',
'..n.oooooooooooOoooooOoooo..',
'..n.ooooooooOoooooooooooooo.',
'....ooooooooooOoooOooooooooo',
'....oooooooooooooooooooooo..',
'....ooo.ooooooooo..oooo.....',
'....ooo.oooo.ooo...ooo......',
'....oo..oo...oo....oo.......',
'....oo..oo...oo....oo.......',
'...OO..OO...OO....OO........',
'............................'],
]};

// TRICERATOPS (32x22) - frill, three horns
SPRITES.tricera = { frames: [
[
'........nn......................',
'.......nn.......................',
'......nn..bbbbbb................',
'.....nn.bbbbbbbbbb..............',
'....nnbbbbbbbbbbbbb.............',
'....nbbbbbbbbbbbbbbb............',
'.nnnnbbbbbbbbbbbbbbb............',
'..nnbbb0bbbbbbbbbbbb............',
'...bbbbbbbbbbbbbbbbbtttttttt....',
'..bbbbbbbbbbbbbbbttttttttttttt..',
'..bbbbbbbbbbbbbttttttttttttttttt',
'..bbbbbbbbbbbbttttttttttttttttt.',
'...bbbbbbbbbbtttttttttttttttt...',
'....bbbbbbbbtttttttttttttttt....',
'.....bbbbbttttttttttttttttt.....',
'......tttttttttttttttttttt......',
'......ttttt.tttt...ttttt........',
'......tttt..tttt...tttt.........',
'......tttt..ttt....ttt..........',
'......tttt..ttt....ttt..........',
'.....TTTT..TTTT...TTTT..........',
'................................'],
[
'................................',
'........nn......................',
'.......nn.......................',
'......nn..bbbbbb................',
'.....nn.bbbbbbbbbb..............',
'....nnbbbbbbbbbbbbb.............',
'....nbbbbbbbbbbbbbbb............',
'.nnnnbbbbbbbbbbbbbbb............',
'..nnbbb0bbbbbbbbbbbbtttttttt....',
'...bbbbbbbbbbbbbbbbttttttttttt..',
'..bbbbbbbbbbbbbbbttttttttttttttt',
'..bbbbbbbbbbbbbbttttttttttttttt.',
'..bbbbbbbbbbbbtttttttttttttttt..',
'...bbbbbbbbbbtttttttttttttttt...',
'....bbbbbbbbttttttttttttttt.....',
'......tttttttttttttttttttt......',
'......ttttt.tttt...ttttt........',
'......tttt..tttt...tttt.........',
'......tttt..ttt....ttt..........',
'.....TTTT..TTTT...TTTT..........',
'................................',
'................................'],
]};

// DILOPHOSAURUS (24x22) - twin crests + colorful frill
SPRITES.dilo = { frames: [
[
'....e...e...............',
'...eee.eee..............',
'...gggggggg.............',
'..gg0ggggggg............',
'..ggggggggggg...........',
'.ggggggggggg............',
'.gngngnggggg............',
'..ggggggykyk............',
'....ggggkyky............',
'.....gggykyk...........g',
'.....ggggyky..........gg',
'......ggggggg........gg.',
'......gggglgggggg...ggg.',
'.....ggggllggggggggggg..',
'.....gggglllgggggggg....',
'.....ggggglllggggg......',
'......g.ggggggg.........',
'.......ggg..ggg.........',
'.......gg...gg..........',
'......gg....gg..........',
'.....GG.....GG..........',
'........................'],
[
'........................',
'....e...e...............',
'...eee.eee..............',
'...gggggggg.............',
'..gg0ggggggg............',
'..ggggggggggg..........g',
'.ggggggggggg..........gg',
'.gngngnggggg.........gg.',
'..ggggggykyk........gg..',
'....ggggkyky.......ggg..',
'.....gggykyk......ggg...',
'.....ggggyky.....gggg...',
'......ggggggg...ggggg...',
'......gggglggggggggg....',
'.....ggggllggggggggg....',
'.....gggglllgggggg......',
'.....ggggglllgggg.......',
'......g.ggggggg.........',
'.......ggg..ggg.........',
'.......gg...gg..........',
'.....GG.....GG..........',
'........................'],
]};

// PTERODACTYL (32x18) - flying, wings spread
SPRITES.ptero = { frames: [
[
'................................',
'..............vvv...............',
'.............vvvvvv.............',
'.........vvvvvvvvvvvvv..........',
'......vvvvvvvvvvvvvvvvvv........',
'...vvvvvvvvvvvvvvvvvvvvvvvv.....',
'.vvvvvvvvvvvvvvvvvvvvvvvvvvvv...',
'vvvvvvvvvvvvVVVVVVvvvvvvvvvvvvv.',
'......vvvvvVVVVVVVVvvvvvvvv.....',
'.O....vvvvVVVVVVVVVVvvv.........',
'..OOOOOO0VVVVVVVVVVV............',
'..OOOO..VVVVVVVVVVVV............',
'.........VVVVVVVVVV.............',
'..........VVV..VVVV.............',
'..........VV....VV..............',
'..........V......V..............',
'................................',
'................................'],
[
'................................',
'................................',
'................................',
'................................',
'................................',
'.............vvvvvv.............',
'.....vvvvvvvvvvvvvvvvvvvv.......',
'..vvvvvvvvvvVVVVVVvvvvvvvvvvv...',
'vvvvvvvvvvvVVVVVVVVvvvvvvvvvvvv.',
'.O.vvvvvvvVVVVVVVVVVvvvvvvvvvvvv',
'..OOOOOO0VVVVVVVVVVVvvvvvvvvvvv.',
'..OOOO..VVVVVVVVVVVV.vvvvvvv....',
'.........VVVVVVVVVV.....vvv.....',
'..........VVV..VVVV.............',
'..........VV....VV..............',
'..........V......V..............',
'................................',
'................................'],
]};

// ANKYLOSAURUS (28x16) - armored, club tail
SPRITES.anky = { frames: [
[
'............................',
'........RRRrrRRrrRR.........',
'......RRrrrrrrrrrrrrRR......',
'.....RrrrRrrRrrRrrRrrrR.....',
'...bbbrrrrrrrrrrrrrrrrrrb...',
'..bb0brrRrrRrrRrrRrrRrrrbb..',
'..bbbbrrrrrrrrrrrrrrrrrrrbbb',
'..bbbbbbbbbbbbbbbbbbbbbbbbRR',
'...bbbbbbbbbbbbbbbbbbbbbbbRR',
'....bbbbbbbbbbbbbbbbbbbbb...',
'.....bbb.bbbb.....bbbb......',
'.....bbb.bbb......bbb.......',
'.....bb..bb.......bb........',
'....BB..BB.......BB.........',
'............................',
'............................'],
[
'............................',
'............................',
'........RRRrrRRrrRR.........',
'......RRrrrrrrrrrrrrRR......',
'.....RrrrRrrRrrRrrRrrrR.....',
'...bbbrrrrrrrrrrrrrrrrrrb...',
'..bb0brrRrrRrrRrrRrrRrrrbb..',
'..bbbbrrrrrrrrrrrrrrrrrrrbbb',
'..bbbbbbbbbbbbbbbbbbbbbbbbRR',
'...bbbbbbbbbbbbbbbbbbbbbbbRR',
'....bbbbbbbbbbbbbbbbbbbbb...',
'.....bbb.bbbb.....bbbb......',
'.....bb..bb.......bb........',
'....BB..BB.......BB.........',
'............................',
'............................'],
]};

// TAR BLOB (20x18)
SPRITES.tarblob = { frames: [
[
'....................',
'....................',
'.......1111.........',
'.....11111111.......',
'....1111111111......',
'...111w11w11111.....',
'...11ww11ww1111.....',
'..111111111111111...',
'..111111111111111...',
'.11111111111111111..',
'.11111111111111111..',
'111111111111111111..',
'1111111111111111111.',
'11111111111111111111',
'.111111111111111111.',
'..1111111111111111..',
'....1111..111111....',
'....................'],
[
'....................',
'....................',
'....................',
'......111111........',
'....1111111111......',
'...111w11w11111.....',
'...11ww11ww1111.....',
'..111111111111111...',
'..111111111111111...',
'.11111111111111111..',
'.11111111111111111..',
'111111111111111111..',
'1111111111111111111.',
'11111111111111111111',
'.111111111111111111.',
'..1111111111111111..',
'....................',
'....................'],
]};

// GIANT DRAGONFLY (20x12)
SPRITES.dragonfly = { frames: [
[
'........cccc..cccc..',
'......cccccccccccccc',
'....cccccccccccccccc',
'..0...ccccccccccccc.',
'.0m0..cccccccccccc..',
'..mmmmmmmmmmmmmmm...',
'..mmMmmMmmMmmMmm....',
'...mm...............',
'....................',
'....................',
'....................',
'....................'],
[
'....................',
'....................',
'....................',
'..0..cccccccccccccc.',
'.0m0cccccccccccccccc',
'..mmmmmmmmmmmmmmmccc',
'..mmMmmMmmMmmMmm....',
'...mm.ccccccccc.....',
'........cccc..cccc..',
'....................',
'....................',
'....................'],
]};

// ALLOSAURUS (32x28) - big theropod, red-brown
SPRITES.allo = { frames: [
[
'......eeee......................',
'.....eeeeeee....................',
'....eee0eeeeee..................',
'...eeeeeeeeeeee.................',
'...eeeeeeeeeeeee................',
'..eeeeeeeeeeeeee................',
'..enenenenneeeee................',
'..eeeeeeeeeeeee.................',
'..nenenenneeeee.................',
'...EEEEEEEeeeeee................',
'.......eeeeeeeee................',
'........eeeeeeeeee.............e',
'.........eeeeeeeeeee..........ee',
'........eeeeeeeeeeeeee.......ee.',
'.......eeeeeeeeeeeeeeeee....eee.',
'......eeeqqeeeeeeeeeeeeeeeeeee..',
'......eeqqqeeeeeeeeeeeeeeeeee...',
'......e.eqqqeeeeeeeeeeeeeee.....',
'........eqqqqeeeeeeeeeeee.......',
'.........eeeeeeeeeeeeee.........',
'..........eeeee..eeeee..........',
'..........eeeee..eeeee..........',
'..........eeee...eeee...........',
'..........eeee...eeee...........',
'.........EEEEE..EEEEE...........',
'........nEEEEE.nEEEEE...........',
'................................',
'................................'],
[
'................................',
'......eeee......................',
'.....eeeeeee....................',
'....eee0eeeeee..................',
'...eeeeeeeeeeee.................',
'...eeeeeeeeeeeee................',
'..eeeeeeeeeeeeee................',
'..enenenenneeeee...............e',
'..eeeeeeeeeeeee...............ee',
'..nenenenneeeee..............ee.',
'...EEEEEEEeeeeee............eee.',
'.......eeeeeeeee...........eee..',
'........eeeeeeeeee........eee...',
'.........eeeeeeeeeee.....eee....',
'........eeeeeeeeeeeeee..eee.....',
'.......eeeeeeeeeeeeeeeeeee......',
'......eeeqqeeeeeeeeeeeeee.......',
'......eeqqqeeeeeeeeeeeee........',
'......e.eqqqeeeeeeeeeee.........',
'........eqqqqeeeeeeeeee.........',
'.........eeeeeeeeeeeee..........',
'..........eeeee..eeeee..........',
'..........eeeee..eeeee..........',
'..........eeee...eeee...........',
'.........EEEEE..EEEEE...........',
'........nEEEEE.nEEEEE...........',
'................................',
'................................'],
]};

// MAMMOTH (32x26)
SPRITES.mammoth = { frames: [
[
'................................',
'..........HHHHHHHHHHH...........',
'.......HHHHHHHHHHHHHHHHH........',
'.....HHHHHHHHHHHHHHHHHHHHH......',
'....HHHHHHHHHHHHHHHHHHHHHHH.....',
'...HHH0HHHHHHHHHHHHHHHHHHHHH....',
'...HHHHHHHHHHHHHHHHHHHHHHHHHH...',
'..HHHHHHHHHHHHHHHHHHHHHHHHHHH...',
'..HHHHHHHHHHHHHHHHHHHHHHHHHHHH..',
'.nHHHHHHHHHHHHHHHHHHHHHHHHHHHH..',
'nn.HHHHHHHHHHHHHHHHHHHHHHHHHHH..',
'n..HHHHHHHHHHHHHHHHHHHHHHHHHH...',
'nn.HHHHHHHHHHHHHHHHHHHHHHHHHH.H.',
'.nnHHHHHHHHHHHHHHHHHHHHHHHHH.HH.',
'...HHHHHHHHHHHHHHHHHHHHHHHH.HH..',
'...HH.HHHHHHHHHHHHHHHHHHHHH.....',
'...HH..HHHHH.....HHHHHHHH.......',
'...HH..HHHHH.....HHHH.HHHH......',
'...HH..HHHH......HHHH..HHHH.....',
'...HH..HHHH......HHHH..HHHH.....',
'...hH..hHHH......hHHH..hHHH.....',
'...hh..hhhh......hhhh..hhhh.....',
'...hh..hhhh......hhhh..hhhh.....',
'..hhhh.hhhh......hhhh..hhhh.....',
'................................',
'................................'],
[
'................................',
'................................',
'..........HHHHHHHHHHH...........',
'.......HHHHHHHHHHHHHHHHH........',
'.....HHHHHHHHHHHHHHHHHHHHH......',
'....HHHHHHHHHHHHHHHHHHHHHHH.....',
'...HHH0HHHHHHHHHHHHHHHHHHHHH....',
'...HHHHHHHHHHHHHHHHHHHHHHHHHH...',
'..HHHHHHHHHHHHHHHHHHHHHHHHHHH...',
'..HHHHHHHHHHHHHHHHHHHHHHHHHHHH..',
'.nHHHHHHHHHHHHHHHHHHHHHHHHHHHH..',
'nn.HHHHHHHHHHHHHHHHHHHHHHHHHHH..',
'n..HHHHHHHHHHHHHHHHHHHHHHHHHH...',
'nn.HHHHHHHHHHHHHHHHHHHHHHHHHH.H.',
'.nnHHHHHHHHHHHHHHHHHHHHHHHHH.HH.',
'...HHHHHHHHHHHHHHHHHHHHHHHH.HH..',
'...HH.HHHHHHHHHHHHHHHHHHHHH.....',
'...HH..HHHHH.....HHHHHHHH.......',
'...HH..HHHHH.....HHHH.HHHH......',
'...HH..HHHH......HHHH..HHHH.....',
'...hH..hHHH......hHHH..hHHH.....',
'...hh..hhhh......hhhh..hhhh.....',
'..hhhh.hhhh......hhhh..hhhh.....',
'................................',
'................................',
'................................'],
]};

// SPINOSAURUS - Swamp Queen (40x30) - sail, crocodile snout, teal
SPRITES.spino = { frames: [
[
'........................................',
'....................m...m...m...........',
'..................mmmm.mmmmmmmm.........',
'.................mmmmmmmmmmmmmmm........',
'................mmmmmMmmmmMmmmmmm.......',
'...............mmmmmmmmmmmmmmmmmmm......',
'..............mmmmmmmMmmmmmMmmmmmmm.....',
'.............mmmmmmmmmmmmmmmmmmmmmmm....',
'.......mmm..mmmmmmmmmmmmmmmmmmmmmmmmm...',
'.....mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm...',
'....mm0mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm..',
'..mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm..',
'.mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm.',
'mnmnmnmnmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm.',
'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm',
'.nmnmnmnmmmmmmmmmmmmmmmmmmmmmmmmm.mmmmmm',
'..MMMMMMMmmmmmmmmmmmmmmmmmmmmmm....mmmm.',
'.........mmmmmmmmmmmmmmmmmmmmm......mm..',
'..........mmmmmmzzzzmmmmmmmmm...........',
'..........mmmmzzzzzzzmmmmmmmm...........',
'..........mm.mmzzzzzzmmmmmmm............',
'..........m..mmmzzzzmmmmmmm.............',
'..............mmmmmmmmmmmm..............',
'..............mmmmm..mmmmm..............',
'..............mmmmm..mmmmm..............',
'..............mmmm...mmmm...............',
'..............mmmm...mmmm...............',
'.............MMMMM..MMMMM...............',
'............nMMMMM.nMMMMM...............',
'........................................'],
[
'........................................',
'........................................',
'....................m...m...m...........',
'..................mmmm.mmmmmmmm.........',
'.................mmmmmmmmmmmmmmm........',
'................mmmmmMmmmmMmmmmmm.......',
'...............mmmmmmmmmmmmmmmmmmm......',
'..............mmmmmmmMmmmmmMmmmmmmm.....',
'.............mmmmmmmmmmmmmmmmmmmmmmm....',
'.......mmm..mmmmmmmmmmmmmmmmmmmmmmmmm...',
'.....mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm...',
'....mm0mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm..',
'..mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm..',
'.mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm.',
'mnmnmnmnmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm.',
'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm.mmmmmm',
'.nmnmnmnmmmmmmmmmmmmmmmmmmmmmmm....mmmmm',
'..MMMMMMMmmmmmmmmmmmmmmmmmmmmm......mmm.',
'..........mmmmmmzzzzmmmmmmmmm...........',
'..........mmmmzzzzzzzmmmmmmmm...........',
'..........mm.mmzzzzzzmmmmmmm............',
'..........m..mmmzzzzmmmmmmm.............',
'..............mmmmmmmmmmmm..............',
'..............mmmmm..mmmmm..............',
'..............mmmmm..mmmmm..............',
'..............mmmm...mmmm...............',
'.............MMMMM..MMMMM...............',
'............nMMMMM.nMMMMM...............',
'........................................',
'........................................'],
]};

// LAVA LIZARD (20x14)
SPRITES.lizard = { frames: [
[
'....................',
'....................',
'..OOO...............',
'.OO0OO..............',
'.OOOOOO.........O...',
'..OOOOOOOxOOOOOOO...',
'...OOOxOOOOxOOOO....',
'...OOOOOxOOOOOO.....',
'....OOOOOOOOOO......',
'....OO.OO..OO.O.....',
'...OO..OO..OO.......',
'...E...E...E........',
'....................',
'....................'],
[
'....................',
'....................',
'....................',
'..OOO...........O...',
'.OO0OO.........OO...',
'.OOOOOO.......OO....',
'..OOOOOOOxOOOOO.....',
'...OOOxOOOOxOOOO....',
'...OOOOOxOOOOOO.....',
'....OOOOOOOOOO......',
'....OO.OO..OO.O.....',
'...E...E...E........',
'....................',
'....................'],
]};

// PACHYCEPHALOSAURUS (24x20) - dome head
SPRITES.pachy = { frames: [
[
'.....nnnnn..............',
'....nnnnnnn.............',
'...nnnnnnnnn............',
'...vvvvvvvvv............',
'..vv0vvvvvvv............',
'..vvvvvvvvvv............',
'..vnvnvvvvv.............',
'....vvvvv...............',
'.....vvvv..............v',
'......vvvvvvv.........vv',
'......vvvvvvvvvvv...vvv.',
'.....vvvvvvvvvvvvvvvvv..',
'.....vvvqqvvvvvvvvvvv...',
'.....vvqqqvvvvvvvvvv....',
'.....v.vqqqvvvvvvvv.....',
'.......vvvvvvvvvvv......',
'........vvvv..vvvv......',
'........vvv...vvv.......',
'........vvv...vvv.......',
'.......VVVV..VVVV.......'],
[
'........................',
'.....nnnnn..............',
'....nnnnnnn.............',
'...nnnnnnnnn...........v',
'...vvvvvvvvv..........vv',
'..vv0vvvvvvv.........vv.',
'..vvvvvvvvvv.......vvv..',
'..vnvnvvvvv.......vvv...',
'....vvvvv........vvv....',
'.....vvvv.......vvv.....',
'......vvvvvvv..vvvv.....',
'......vvvvvvvvvvvvv.....',
'.....vvvvvvvvvvvvvv.....',
'.....vvvqqvvvvvvvvv.....',
'.....vvqqqvvvvvvvv......',
'.....v.vqqqvvvvvvv......',
'.......vvvvvvvvvv.......',
'........vvvv..vvvv......',
'........vvv...vvv.......',
'.......VVVV..VVVV.......'],
]};

// CARNOTAURUS (30x26) - horned theropod, purple
SPRITES.carno = { frames: [
[
'....R..R......................',
'....pppppp....................',
'...pppppppp...................',
'..ppp0ppppppp.................',
'..pppppppppppp................',
'.pppppppppppppp...............',
'.pnpnpnpnpppppp...............',
'.ppppppppppppp................',
'.npnpnpnppppppp...............',
'..PPPPPPPppppppp..............',
'.......pppppppppp.............',
'........ppppppppppp..........p',
'.........pppppppppppp.......pp',
'........pppppppppppppppp...pp.',
'.......ppppppppppppppppppppp..',
'......pppzzpppppppppppppppp...',
'......ppzzzppppppppppppppp....',
'......p.pzzzpppppppppppp......',
'........pzzzpppppppppp........',
'.........pppppppppppp.........',
'..........ppppp.pppp..........',
'..........ppppp.pppp..........',
'..........pppp..pppp..........',
'..........pppp..pppp..........',
'.........PPPPP.PPPPP..........',
'........nPPPPPnPPPPP..........'],
[
'..............................',
'....R..R......................',
'....pppppp....................',
'...pppppppp...................',
'..ppp0ppppppp.................',
'..pppppppppppp................',
'.pppppppppppppp..............p',
'.pnpnpnpnpppppp.............pp',
'.ppppppppppppp.............pp.',
'.npnpnpnppppppp...........ppp.',
'..PPPPPPPppppppp.........ppp..',
'.......pppppppppp.......ppp...',
'........ppppppppppp....ppp....',
'.........ppppppppppppppppp....',
'........ppppppppppppppppp.....',
'.......pppppppppppppppppp.....',
'......pppzzpppppppppppp.......',
'......ppzzzpppppppppppp.......',
'......p.pzzzppppppppppp.......',
'........pzzzpppppppppp........',
'.........pppppppppppp.........',
'..........ppppp.pppp..........',
'..........pppp..pppp..........',
'..........pppp..pppp..........',
'.........PPPPP.PPPPP..........',
'........nPPPPPnPPPPP..........'],
]};

// GIGANOTOSAURUS (40x32) - huge, dark olive with stripes
SPRITES.giga = { frames: [
[
'........................................',
'.......DDDDDD...........................',
'.....DDDDDDDDDDD........................',
'....DDDD0DDDDDDDDD......................',
'...DDDDDDDDDDDDDDDD.....................',
'...DDDDDDDDDDDDDDDDD....................',
'..DDDDDDDDDDDDDDDDDD....................',
'..DnDnDnDnDnDDDDDDDD....................',
'..DDDDDDDDDDDDDDDDD.....................',
'..nDnDnDnDnDDDDDDDD.....................',
'...1111111111DDDDDDD....................',
'..........DDDDDDDDDDD...................',
'...........DDDDDDDDDDDD.................',
'............DDDDdDDDDDDDD..............D',
'...........DDDDdDDDDdDDDDDDD..........DD',
'..........DDDDdDDDDDDDdDDDDDDDD.....DDD.',
'.........DDDDDDDDDDDDDDdDDDDDDDDDDDDDDD.',
'........DDDvvDDDDDDdDDDDDDdDDDDDDDDDDD..',
'........DDvvvDDDDDDDDDDDDDDDDDDDDDDDD...',
'........D.DvvvDDDDDDDDDDDDDDDDDDDDD.....',
'..........DvvvvDDDDDDDDDDDDDDDDDD.......',
'...........DDDDDDDDDDDDDDDDDDDD.........',
'............DDDDDDDD...DDDDDDD..........',
'............DDDDDDD....DDDDDD...........',
'............DDDDDD.....DDDDDD...........',
'............DDDDDD.....DDDDDD...........',
'............DDDDDD.....DDDDDD...........',
'............DDDDDD.....DDDDDD...........',
'...........111111.....111111............',
'..........n111111....n111111............',
'.........n.111111...n.111111............',
'........................................'],
[
'........................................',
'........................................',
'.......DDDDDD...........................',
'.....DDDDDDDDDDD........................',
'....DDDD0DDDDDDDDD......................',
'...DDDDDDDDDDDDDDDD.....................',
'...DDDDDDDDDDDDDDDDD....................',
'..DDDDDDDDDDDDDDDDDD...................D',
'..DnDnDnDnDnDDDDDDDD..................DD',
'..DDDDDDDDDDDDDDDDD..................DD.',
'..nDnDnDnDnDDDDDDDD.................DDD.',
'...1111111111DDDDDDD...............DDD..',
'..........DDDDDDDDDDD.............DDD...',
'...........DDDDDDDDDDDD..........DDD....',
'............DDDDdDDDDDDDD.......DDD.....',
'...........DDDDdDDDDdDDDDDDD...DDDD.....',
'..........DDDDdDDDDDDDdDDDDDDDDDDDD.....',
'.........DDDDDDDDDDDDDDdDDDDDDDDDD......',
'........DDDvvDDDDDDdDDDDDDdDDDDDD.......',
'........DDvvvDDDDDDDDDDDDDDDDDDD........',
'........D.DvvvDDDDDDDDDDDDDDDDD.........',
'..........DvvvvDDDDDDDDDDDDDDDD.........',
'...........DDDDDDDDDDDDDDDDDDD..........',
'............DDDDDDDD...DDDDDDD..........',
'............DDDDDDD....DDDDDD...........',
'............DDDDDD.....DDDDDD...........',
'............DDDDDD.....DDDDDD...........',
'............DDDDDD.....DDDDDD...........',
'...........111111.....111111............',
'..........n111111....n111111............',
'.........n.111111...n.111111............',
'........................................'],
]};

// KING REX (48x40) - the final boss, golden crown, scar
SPRITES.trex = { frames: [
[
'..........y.y.y.................................',
'..........yyyyy.................................',
'........ddyyyyydd...............................',
'.......ddddddddddd..............................',
'......dddddddddddddd............................',
'.....ddddd0ddddddddd............................',
'.....dddd0e0dddddddd............................',
'....dddddd0dddddddddd...........................',
'....dddddddddddddddddd..........................',
'....ddddddddddddddddddd.........................',
'...dddnddndddndddddddddd........................',
'...ddddddddddddddddddddd........................',
'...dnddnddnddnddddddddddd.......................',
'....DDDDDDDDDDDDdddddddddd......................',
'.....DDDDDDDDDDdddddddddddd.....................',
'.........DDDDdddddddddddddddd...................',
'............ddddddddddddddddddd.................',
'..........ddddddddddddddddddddddd...............',
'.........dddddddlllddddddddddddddd..............',
'........ddddddddlllldddddddddddddddd............',
'........dddddddlllllldddddddddddddddddd.........',
'........dd.ddddllllllddddddddddddddddddddd......',
'........d..ddddlllllllddddddddddddddddddddddd...',
'...........dddddlllllldddddddddddddddddddddddddd',
'............ddddddllllddddddddddddddddd.dddddddd',
'.............dddddddddddddddddddddddd.....ddddd.',
'..............dddddddddddddddddddd........ddd...',
'...............ddddddddd.dddddddd...............',
'...............dddddddd...ddddddd...............',
'................ddddddd...dddddd................',
'................dddddd.....ddddd................',
'................dddddd.....ddddd................',
'.................ddddd.....ddddd................',
'.................ddddd.....ddddd................',
'.................ddddd.....ddddd................',
'................DDDDDD....DDDDDD................',
'...............DDDDDDD...DDDDDDD................',
'..............nDDDDDDD..nDDDDDDD................',
'.............n.DDDDDDD.n.DDDDDDD................',
'................................................'],
[
'................................................',
'..........y.y.y.................................',
'..........yyyyy.................................',
'........ddyyyyydd...............................',
'.......ddddddddddd..............................',
'......dddddddddddddd............................',
'.....ddddd0ddddddddd............................',
'.....dddd0e0dddddddd............................',
'....dddddd0dddddddddd...........................',
'....dddddddddddddddddd..........................',
'....ddddddddddddddddddd.........................',
'...dddnddndddndddddddddd........................',
'...ddddddddddddddddddddd........................',
'...dnddnddnddnddddddddddd.......................',
'....DDDDDDDDDDDDdddddddddd......................',
'.....DDDDDDDDDDdddddddddddd..................dd.',
'.........DDDDdddddddddddddddd..............dddd.',
'............ddddddddddddddddddd...........dddd..',
'..........ddddddddddddddddddddddd........dddd...',
'.........dddddddlllddddddddddddddd.....ddddd....',
'........ddddddddlllldddddddddddddddd..ddddd.....',
'........dddddddlllllldddddddddddddddddddddd.....',
'........dd.ddddllllllddddddddddddddddddddd......',
'........d..ddddlllllllddddddddddddddddddd.......',
'...........dddddlllllldddddddddddddddd..........',
'............ddddddllllddddddddddddddd...........',
'.............ddddddddddddddddddddddd............',
'..............ddddddddddddddddddd...............',
'...............ddddddddd.dddddddd...............',
'...............dddddddd...ddddddd...............',
'................ddddddd...dddddd................',
'................dddddd.....ddddd................',
'.................ddddd.....ddddd................',
'.................ddddd.....ddddd................',
'.................ddddd.....ddddd................',
'................DDDDDD....DDDDDD................',
'...............DDDDDDD...DDDDDDD................',
'..............nDDDDDDD..nDDDDDDD................',
'.............n.DDDDDDD.n.DDDDDDD................',
'................................................'],
]};

// BRONTOSAURUS (40x30) - gentle giant for events/backgrounds
SPRITES.bronto = [
'.....ii.................................',
'....iiii................................',
'...ii0ii................................',
'...iiiii................................',
'....iii.................................',
'....iii.................................',
'....iii.................................',
'.....iii................................',
'.....iii................................',
'......iii...............................',
'......iiii..............................',
'.......iiii.............................',
'........iiiiiiiiiiiiiiii................',
'.......iiiiiiiiiiiiiiiiiiiii............',
'......iiiiiiiiiiiiiiiiiiiiiiiii.........',
'.....iiiiiiiiiiiiiiiiiiiiiiiiiiiii......',
'.....iiiiiiiiiiiiiiiiiiiiiiiiiiiiiii....',
'.....iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii..',
'.....iiiiiiiiiiiiiiiiiiiiiiiiiiiii.iiii.',
'......iiiiiiiiiiiiiiiiiiiiiiiiii....iii.',
'.......iiiiiiiiiiiiiiiiiiiiiii.......ii.',
'........iiiii....iiiiiiiiii...........i.',
'........iiiii....iiiii..iiii............',
'........iiiii....iiiii..iiii............',
'........iiii.....iiii...iiii............',
'........iiii.....iiii...iiii............',
'.......jjjjj....jjjjj..jjjjj............',
'.......jjjjj....jjjjj..jjjjj............',
'........................................',
'........................................'];

// ===================== RELIC ICONS (10x10) =================================
SPRITES.relic_trex_head = [
'..dddddd..','.dddddddd.','dddd0ddddd','dddddddddd','ddddddddd.','dndndnddd.','dddddddd..','.ndndnd...','..dddd....','..........'];
SPRITES.relic_bone_pick = [
'....nn....','...nnnn...','..nnnnnn..','..nnnnnn..','..nnnnnn..','...nnnn...','...nnnn...','....nn....','....nn....','..........'];
SPRITES.relic_mammoth_tusk = [
'........nn','.......nnn','......nnn.','.....nnn..','....nnn...','...nnn....','..nnn.....','.nnn......','nnn.......','..........'];
SPRITES.relic_saber_fang = [
'..nnnn....','..nnnnn...','...nnnn...','...nnnn...','....nnn...','....nnn...','.....nn...','.....nn...','......n...','..........'];
SPRITES.relic_fire_stone = [
'....x.....','...xxx....','..xxoxx...','.xxoooxx..','.xooyoox..','.RRRRRRR..','RRRRRRRRR.','RRRRRRRRR.','.RRRRRRR..','..........'];
SPRITES.relic_dino_egg = [
'...nnnn...','..nnnnnn..','.nnngnnnn.','.nnnnnnnn.','nnngnnnngn','nnnnnnnnnn','nnnnngnnnn','.nnnnnnnn.','..nnnnnn..','...nnnn...'];
SPRITES.relic_meteor_shard = [
'......cc..','.....ccc..','....ccuc..','...cuucc..','..cuuuc...','.cuuuc....','.cuucc....','cuucc.....','ccc.......','..........'];
SPRITES.relic_wheel = [
'..RRRRRR..','.RrrrrrrR.','RrrRrrRrrR','RrrrRRrrrR','RrRRRRRRrR','RrrrRRrrrR','RrrRrrRrrR','.RrrrrrrR.','..RRRRRR..','..........'];
SPRITES.relic_bone_necklace = [
'..........','.b......b.','b.b....b.b','b..b..b..b','.b..bb..b.','.n.n..n.n.','..n.nn.n..','...n..n...','....nn....','..........'];
SPRITES.relic_tar_bucket = [
'..........','.BBBBBBBB.','.B111111B.','.B111111B.','..111111..','..111111..','..111111..','..111111..','...1111...','..........'];
SPRITES.relic_ancient_shell = [
'...vvvv...','..vAvvAv..','.vvAvvAvv.','vAvvvvvvAv','vvvvAAvvvv','vvvvAAvvvv','vAvvvvvvAv','.vvvvvvvv.','..vvvvvv..','..........'];
SPRITES.relic_lucky_feather = [
'.......ee.','......eee.','.....eeee.','....eeee..','...eeeee..','..eeeee...','.eeee.....','.eee......','ee........','..........'];
SPRITES.relic_echo_drum = [
'..........','.bbbbbbbb.','bnnnnnnnnb','bnnnnnnnnb','bbbbbbbbbb','bTbbTbbTbb','bbbbbbbbbb','bTbbTbbTbb','.bbbbbbbb.','..........'];
SPRITES.relic_cave_painting = [
'RRRRRRRRRR','RrrrrrrrrR','RrrEErrrrR','RrEEEEErrR','RrrEEEEErR','RrrrEErrrR','RrrrErErrR','RrrrrrrrrR','RRRRRRRRRR','..........'];
SPRITES.relic_golden_banana = [
'......a...','.....aa...','....aaa...','...aaaa...','..aaaa....','.aaaa.....','aaaa......','aaa.......','.A........','..........'];
SPRITES.relic_war_drum = [
'..........','..eeeeee..','.eEEEEEEe.','eEEEEEEEEe','eeeeeeeeee','eyeeyeeyee','eeeeeeeeee','eeeeeeeeee','.eeeeeeee.','..........'];
SPRITES.relic_amber = [
'...oooo...','..ooooo...','.ooyoooo..','.oyyooooo.','ooyoooooo.','oooooo0oo.','oooooooo..','.ooooooo..','..oooo....','..........'];
SPRITES.relic_club_of_kings = [
'.....yyyy.','....yyyyyy','....yyyyyy','...byyyyy.','..bb.yyy..','.bb.......','bb........','b.........','..........','..........'];
SPRITES.relic_stone_tablet = [
'.rrrrrrrr.','rrrrrrrrrr','rr0rr0rrrr','rrrrrrrrrr','rr0r0r0rrr','rrrrrrrrrr','rr0rr0r0rr','rrrrrrrrrr','.rrrrrrrr.','..........'];
SPRITES.relic_moon_flute = [
'..........','..........','nnnnnnnnnn','n0n0n0n0nn','nnnnnnnnnn','..........','.....yy...','....yy....','....yy....','.....yy...'];
SPRITES.relic_tribal_mask = [
'..bbbbbb..','.bbbbbbbb.','bbeebbeebb','bb00bb00bb','bbbbbbbbbb','bbbbnnbbbb','.bbnnnnbb.','.bbbbbbbb.','..bbbbbb..','..........'];
SPRITES.relic_volcano_heart = [
'..........','.xx....xx.','xxxx..xxxx','xxxxxxxxxx','xxoyooxxxx','.xxoooxxx.','..xxooxx..','...xxxx...','....xx....','..........'];
SPRITES.relic_thunder_egg = [
'...nnnn...','..nnnnnn..','.nnnynnnn.','.nnynnnnn.','nnyyyynnnn','nnnnnynnnn','nnnnnynnnn','.nnnnnnnn.','..nnnnnn..','...nnnn...'];
SPRITES.relic_petra_ribbon = [
'..........','.kk....kk.','kkkk..kkkk','.kkkkkkkk.','..kkkkkk..','.kkkkkkkk.','kkk.kk.kkk','kk..kk..kk','k...kk...k','..........'];

// ===================== CARD ART (12x12) ====================================
SPRITES.art_strum = [
'..........nn','.........nnn','......BBnnn.','....BBBBnn..','...BBBBBB...','..BB0BBB....','..BBBBB.....','...BBB......','....B.......','............','............','............'];
SPRITES.art_shield = [
'..rrrrrrrr..','.rRrrrrrrRr.','rrrrrrrrrrrr','rrrRrrrrRrrr','rrrrrrrrrrrr','rrrrRrrRrrrr','.rrrrrrrrrr.','.rrrrRRrrrr.','..rrrrrrrr..','...rrrrrr...','....rrrr....','.....rr.....'];
SPRITES.art_club = [
'........BBB.','.......BBBBB','.......BBBBB','......BBBBB.','.....BBBB...','....bbb.....','...bbb......','..bbb.......','.bbb........','bbb.........','bb..........','............'];
SPRITES.art_drum = [
'............','.bbbbbbbbbb.','bnnnnnnnnnnb','bnnnnnnnnnnb','bbbbbbbbbbbb','bTbbbTbbbTbb','bbTbbbTbbbTb','bbbTbbbTbbbb','bbbbbbbbbbbb','.bbbbbbbbbb.','............','............'];
SPRITES.art_note = [
'......yyyyyy','......y....y','......y....y','......y.....','......y.....','......y.....','......y.....','....yyy.....','...yyyy.....','..yyyyy.....','...yyy......','............'];
SPRITES.art_fire = [
'.....x......','....xx......','....xxx.....','...xxxx.x...','...xoxxxx...','..xxooxxx...','..xoooxxx...','.xxooyoxxx..','.xooyyooxx..','.xooyyooxx..','..xooooxx...','...xxxxx....'];
SPRITES.art_skull = [
'...nnnnnn...','..nnnnnnnn..','.nnnnnnnnnn.','.nn00nn00nn.','.nn00nn00nn.','.nnnnnnnnnn.','.nnnn0nnnnn.','..nnnnnnnn..','...n0n0n0...','...nnnnnn...','............','............'];
SPRITES.art_heart = [
'............','..ee....ee..','.eeee..eeee.','eeeeeeeeeeee','eeqeeeeeeeee','eeeeeeeeeeee','.eeeeeeeeee.','..eeeeeeee..','...eeeeee...','....eeee....','.....ee.....','............'];
SPRITES.art_star = [
'.....yy.....','.....yy.....','....yyyy....','yyyyyyyyyyyy','.yyyyyyyyyy.','..yyyyyyyy..','...yyyyyy...','...yyyyyy...','..yyy..yyy..','.yy......yy.','............','............'];
SPRITES.art_bolt = [
'......cccc..','.....cccc...','....cccc....','...cccc.....','..cccccccc..','.....cccc...','....cccc....','...cccc.....','..cccc......','.ccc........','.cc.........','............'];
SPRITES.art_foot = [
'..D..D..D...','.DD.DDD.DD..','............','..DDDDDDD...','.DDDDDDDDD..','.DDDDDDDDD..','.DDDDDDDDD..','..DDDDDDD...','...DDDDD....','............','............','............'];
SPRITES.art_egg = [
'....nnnn....','...nnnnnn...','..nnngnnnn..','..nnnnnnnn..','.nnngnnnngn.','.nnnnnnnnnn.','.nnnnngnnnn.','.nnnnnnnnnn.','..nnnnnnnn..','..nngnnnnn..','...nnnnnn...','....nnnn....'];
SPRITES.art_crowd = [
'..hh....hh..','..ss.hh.ss..','.tttt.ss.ttt','sttts.tt.stt','.tttt.stts..','..ss..tttt..','..ss...ss...','..bb...ss...','.......bb...','............','............','............'];
SPRITES.art_horn = [
'............','nn..........','nnn.........','.nnn........','..nnnn......','...nnnnn....','....nnnnnn..','.....nnnnnnn','......nnnnn.','.......nnn..','............','............'];
SPRITES.art_boulder = [
'....rrrr....','..rrrrrrrr..','.rrrRrrrrrr.','rrrrrrrrRrrr','rrRrrrrrrrrr','rrrrrrRrrrrr','rrrrrrrrrrrr','.rrRrrrrRrr.','..rrrrrrrr..','...rrrrrr...','............','............'];
SPRITES.art_wave = [
'............','............','..cc........','.ccccc......','ccc.cccc..cc','.....ccccccc','.......cccc.','uuuuuuuuuuuu','uUuuUuuUuuUu','uuuuuuuuuuuu','............','............'];
SPRITES.art_spiral = [
'....pppp....','..pp....pp..','.p........p.','.p..pppp..p.','p..p....p..p','p..p.pp.p..p','p..p.pp....p','.p..pppp..p.','.p........p.','..pp....pp..','....pppp....','............'];
SPRITES.art_flute = [
'............','............','............','nnnnnnnnnnnn','n0n0n0n0nnnn','nnnnnnnnnnnn','............','....y.......','...yy..y....','......yy....','............','............'];
SPRITES.art_bass = [
'..........BB','.........BBB','........BBB.','.......BBB..','......BBB...','.....BBB....','..bbbbbb....','.bbbbbbb....','.bbb0bbb....','.bbbbbbb....','..bbbbb.....','............'];
SPRITES.art_moon = [
'....yyyy....','..yyyyyy....','.yyyyy......','yyyyy.......','yyyy........','yyyy........','yyyy........','yyyyy.......','.yyyyy......','..yyyyyy....','....yyyy....','............'];
SPRITES.art_meat = [
'............','.....bbbbb..','...bbbEEEbb.','..bbEEEEEEb.','.nbEEEEEEEb.','nnbEEEEEEb..','.nbbEEEEbb..','..nbbbbbb...','............','............','............','............'];

// ===================== MAP NODE ICONS (12x12) ==============================
SPRITES.node_combat = [
'nn........nn','.nn......nn.','..nn....nn..','...nn..nn...','....nnnn....','.....nn.....','....nnnn....','...nn..nn...','..nn....nn..','.nn......nn.','nn........nn','............'];
SPRITES.node_elite = [
'n.........n.','nn..nnnn..nn','.nnnnnnnnnn.','..nnnnnnnn..','..ne0nn0en..','..n00nn00n..','..nnnnnnnn..','..nnnn0nnn..','...nnnnnn...','....n0n0....','....nnnn....','............'];
SPRITES.node_event = [
'...cccccc...','..cc....cc..','..cc....cc..','........cc..','.......cc...','......cc....','.....cc.....','.....cc.....','............','.....cc.....','.....cc.....','............'];
SPRITES.node_rest = [
'.....x......','....xxo.....','...xxoox....','...xooyxx...','..xooyyox...','..xoyyyoxx..','.bbbbbbbbbb.','..bbBBBBbb..','.bbbbBBbbbb.','bbbb....bbbb','............','............'];
SPRITES.node_shop = [
'.....yy.....','....yyyy....','...vvvvvv...','..vvvvvvvv..','.vvvvvvvvvv.','.vvvAvvAvvv.','.vvvvvvvvvv.','.vvAvvvvAvv.','..vvvvvvvv..','...vvvvvv...','............','............'];
SPRITES.node_treasure = [
'............','..bbbbbbbb..','.bbbbbbbbbb.','.bBBBBBBBBb.','.bbbbyybbbb.','.bbbbyybbbb.','.bBBBBBBBBb.','.bbbbbbbbbb.','.bbbbbbbbbb.','..bbbbbbbb..','............','............'];
SPRITES.node_boss = [
'yy.y..y.yy..','yyyyyyyyyy..','ddddddddddd.','dd0dddd0dddd','d000dd000ddd','dddddddddddd','dddnddnddnd.','dnddnddnddd.','.dddddddd...','............','............','............'];

// ===================== UI ICONS ===========================================
SPRITES.energy = [
'...cccccc...','..cccuuucc..','.ccuuccuucc.','cccuc..cuccc','ccuuc..cuucc','ccuuc..cuucc','cccuc..cuccc','.ccuuccuucc.','..cccuuucc..','...cccccc...','............','............'];
SPRITES.energy_empty = [
'...111111...','..11222211..','.1122112211.','111212212111','112212212211','112212212211','111212212111','.1122112211.','..11222211..','...111111...','............','............'];
SPRITES.heart = ['.ee..ee.','eeeeeeee','eqeeeeee','eeeeeeee','.eeeeee.','..eeee..','...ee...','........'];
SPRITES.coin = ['..yyyy..','.yyyyyy.','yyAyyAyy','yyyAAyyy','yyyAAyyy','yyAyyAyy','.yyyyyy.','..yyyy..'];
SPRITES.shield = ['.rrrrrrrr.','rrRrrrrRrr','rrrrrrrrrr','rrrRrrRrrr','rrrrrrrrrr','.rrrRRrrr.','.rrrrrrrr.','..rrrrrr..','...rrrr...','....rr....'];
SPRITES.intent_attack = ['e........e','ee......ee','.ee....ee.','..ee..ee..','...eeee...','...eeee...','..ee..ee..','.ee....ee.','ee......ee','e........e'];
SPRITES.intent_defend = ['.uuuuuuuu.','uucuuuucuu','uuuuuuuuuu','uuucuucuuu','uuuuuuuuuu','.uuuccuuu.','.uuuuuuuu.','..uuuuuu..','...uuuu...','....uu....'];
SPRITES.intent_buff = ['....gg....','...gggg...','..gggggg..','.gggggggg.','gggggggggg','...gggg...','...gggg...','...gggg...','...gggg...','...gggg...'];
SPRITES.intent_debuff = ['...pppp...','...pppp...','...pppp...','...pppp...','...pppp...','pppppppppp','.pppppppp.','..pppppp..','...pppp...','....pp....'];
SPRITES.intent_unknown = ['..333333..','.33....33.','.33....33.','.......33.','......33..','.....33...','....33....','....33....','..........','....33....'];
SPRITES.intent_summon = ['....ww....','...w..w...','..w....w..','.w..ww..w.','w..w..w..w','...w..w...','...w..w...','....ww....','..........','..........'];
SPRITES.intent_heal = ['...eeee...','...eeee...','...eeee...','eeeeeeeeee','eeeeeeeeee','eeeeeeeeee','...eeee...','...eeee...','...eeee...','..........'];
SPRITES.st_str = ['.ee..ee.','eeeeeeee','eeeeeeee','.eeeeee.','..eeee..','...ee...','..eeee..','.eeeeee.'];
SPRITES.st_weak = ['..3333..','.3....3.','......3.','.....3..','....3...','...3....','........','...3....'];
SPRITES.st_vuln = ['...pp...','..pppp..','.pppppp.','pppppppp','.p.pp.p.','...pp...','...pp...','...pp...'];
SPRITES.st_stun = ['y..yy..y','.y.yy.y.','..yyyy..','yyyyyyyy','..yyyy..','.y.yy.y.','y..yy..y','........'];
SPRITES.st_burn = ['...x....','..xx....','..xxx...','.xxox.x.','.xoxxxx.','xxooxxx.','xoooxxx.','.xxxxx..'];
SPRITES.st_hype = ['..k..k..','.kk..kk.','.kkkkkk.','kkkkkkkk','.kkkkkk.','..kkkk..','...kk...','........'];
SPRITES.st_regen = ['...gg...','..gggg..','.gggggg.','gg.gg.gg','...gg...','..gggg..','...gg...','........'];
SPRITES.st_thorns = ['n..nn..n','.n.nn.n.','..nnnn..','nnnnnnnn','..nnnn..','.n.nn.n.','n..nn..n','........'];
SPRITES.gem = { frames: [[
'...eeee...','..eeeeee..','.eeqqeeee.','eeqqeeeeee','eeqeeeeeee','eeeeeeeeee','eeeeeeeeee','.eeeeeeee.','..eeeeee..','...eeee...']] };
SPRITES.gem_g = { frames: SPRITES.gem.frames, pal: { 'e': '#5cb84a', 'q': '#c6f0a0' } };
SPRITES.gem_r = { frames: SPRITES.gem.frames, pal: { 'e': '#d83a3a', 'q': '#ffb0a0' } };
SPRITES.gem_y = { frames: SPRITES.gem.frames, pal: { 'e': '#f6d743', 'q': '#fff6c0' } };
SPRITES.gem_b = { frames: SPRITES.gem.frames, pal: { 'e': '#3b82f6', 'q': '#b0d0ff' } };
SPRITES.gem_p = { frames: SPRITES.gem.frames, pal: { 'e': '#c95c93', 'q': '#ffd0f0' } };
SPRITES.cursor_hand = ['..ww....','..ww....','..wwww..','..wwwwww','wwwwwwww','wwwwwwww','.wwwwww.','..wwww..'];
SPRITES.arrow_right = ['....n...','....nn..','nnnnnnn.','nnnnnnnn','nnnnnnn.','....nn..','....n...','........'];
SPRITES.marker = ['...yy...','..yyyy..','.yyyyyy.','yyyyyyyy','.yyyyyy.','..yyyy..','...yy...','........'];
SPRITES.lock = ['..RRRR..','.RR..RR.','.RR..RR.','RRRRRRRR','RRRyyRRR','RRRyyRRR','RRRRRRRR','.RRRRRR.'];
SPRITES.check = ['......g.','.....gg.','....gg..','g..gg...','gggg....','.gg.....','........','........'];
SPRITES.skull_small = ['.nnnn.','nnnnnn','n0nn0n','nnnnnn','.n0n0.','.nnnn.'];
SPRITES.exhaust_icon = ['..x..x..','.xx.xxx.','.xxoxxx.','xxooxxxx','xooyoxxx','.xoooxx.','..xxxx..','........'];

// ===================== MAP LANDMARKS ======================================
SPRITES.lm_volcano = { frames: [[
'......................3.........................',
'.....................333........................',
'....................33333.......................',
'...................3333333......................',
'.................xxxoooxxxx.....................',
'................RRxxoxxxxRRR....................',
'...............RRRRxxxxRRRRRR...................',
'..............RRRRRRxRRRRRRRRR..................',
'.............RRRRRRRxRRRRRRRRRR.................',
'............RRRRRRRRxRRRRRRRRRRR................',
'...........RRRRRRRRRxxRRRRRRRRRRR...............',
'..........RRRRRRRRRRRxRRRRRRRRRRRR..............',
'.........RRRRRRRRRRRRxRRRRRRRRRRRRR.............',
'........RRRRRRRRRRRRRxxRRRRRRRRRRRRR............',
'.......RRRRRRRRRRRRRRRxRRRRRRRRRRRRRR...........',
'......RRRRRRRRRRRRRRRRxRRRRRRRRRRRRRRR..........',
'.....RRRRRRRRRRRRRRRRRxRRRRRRRRRRRRRRRR.........',
'....RRRRRRRRRRRRRRRRRRxxRRRRRRRRRRRRRRRR........',
'...RRRRRRRRRRRRRRRRRRRRxRRRRRRRRRRRRRRRRR.......',
'..RRRRRRRRRRRRRRRRRRRRRxRRRRRRRRRRRRRRRRRR......',
'.RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR.....',
'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR....',
'................................................',
'................................................'],
[
'......................3.........................',
'.....................333........................',
'....................33333.......................',
'...................3333333......................',
'.................xxxoooxxxx.....................',
'................RRxxoxxxxRRR....................',
'...............RRRRxxxxRRRRRR...................',
'..............RRRRRRxRRRRRRRRR..................',
'.............RRRRRRRxRRRRRRRRRR.................',
'............RRRRRRRRxRRRRRRRRRRR................',
'...........RRRRRRRRRxxRRRRRRRRRRR...............',
'..........RRRRRRRRRRRxRRRRRRRRRRRR..............',
'.........RRRRRRRRRRRRxxRRRRRRRRRRRR.............',
'........RRRRRRRRRRRRRRxRRRRRRRRRRRRR............',
'.......RRRRRRRRRRRRRRRxRRRRRRRRRRRRRR...........',
'......RRRRRRRRRRRRRRRRxxRRRRRRRRRRRRRR..........',
'.....RRRRRRRRRRRRRRRRRRxRRRRRRRRRRRRRRR.........',
'....RRRRRRRRRRRRRRRRRRRxRRRRRRRRRRRRRRRR........',
'...RRRRRRRRRRRRRRRRRRRRxxRRRRRRRRRRRRRRRR.......',
'..RRRRRRRRRRRRRRRRRRRRRRxRRRRRRRRRRRRRRRRR......',
'.RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR.....',
'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR....',
'................................................',
'................................................']] };
SPRITES.lm_palm = [
'......gg........','...ggggggg......','.gggggGGgggg....','ggggGGgGGggggg..','gggGG.gg.GGggg..','GG...gg.....GG..','.....gb.........','.....bb.........','.....bb.........','.....bb.........','.....bb.........','....bb..........','....bb..........','....bb..........','....bb..........','....bb..........','....bb..........','....BB..........','....BB..........','....BB..........','....BB..........','....BB..........','....BB..........','....BB..........','...BBBB.........','................','................','................'];
SPRITES.lm_tarpit = [
'........1111111111......','.....1111111111111111...','...11111111111111111111.','..111111111111111111111.','.1111111w11111111111111.','.11111111111111111w11111','..1111111111111111111111','...11111111111111111111.','.....111111111111111....','................','........................','........................'].map(r => r.padEnd(24, '.'));
SPRITES.lm_ribs = [
'........................','...nn.....nn.....nn.....','...nn.....nn.....nn.....','..nn.....nn.....nn......','..nn.....nn.....nn......','.nnnnnnnnnnnnnnnnnnnnn..','.nn.....nn.....nn.......','.nn.....nn.....nn.......','nn.....nn.....nn........','nn.....nn.....nn........','........................','........................'];
SPRITES.lm_cave = [
'........RRRRRRRR........','.....RRRRRRRRRRRRRR.....','...RRRRRRRRRRRRRRRRRR...','..RRRRRRR000000RRRRRRR..','.RRRRRR0000000000RRRRRR.','.RRRRR000000000000RRRRR.','RRRRRR000000000000RRRRRR','RRRRR00000000000000RRRRR','RRRRR00000000000000RRRRR','RRRRR00000000000000RRRRR','RRRRR00000000000000RRRRR','RRRRR00000000000000RRRRR','RRRRR00000000000000RRRRR','........................','........................','........................','........................','........................'];
SPRITES.lm_hut = [
'.........tt.........','.......tttttt.......','.....tttttttttt.....','...tttttttttttttt...','.tttttttttttttttttt.','ttTtTtTtTtTtTtTtTtTt','.bbbbbbbbbbbbbbbbbb.','.bbbbbbbb00bbbbbbbb.','.bbbbbbb0000bbbbbbb.','.bbbbbbb0000bbbbbbb.','.bbbbbbb0000bbbbbbb.','.bbbbbbb0000bbbbbbb.','.BBBBBBBBBBBBBBBBBB.','....................','....................','....................','....................','....................'];
SPRITES.lm_arch = [
'........rrrrrrrr........','......rrrrrrrrrrrr......','....rrrrrrrrrrrrrrrr....','...rrrrrr......rrrrrr...','..rrrrr..........rrrrr..','..rrrr............rrrr..','.rrrr..............rrrr.','.rrrr..............rrrr.','.rrrr..............rrrr.','.rrrr..............rrrr.','.rrrr..............rrrr.','.rrrr..............rrrr.','.rrrr..............rrrr.','.rrrr..............rrrr.','.RRRR..............RRRR.','.RRRR..............RRRR.','........................','........................','........................','........................'];
SPRITES.lm_waterfall = { frames: [[
'....RRRRRRRRRRRR....','...RRRRRRRRRRRRRR...','..RRRRuuccuuccuRRR..','..RRRRuccuuccuuRRR..','..RRRRucuuccuucRRR..','..RRRRuuccuuccuRRR..','..RRRRcuuccuuccRRR..','..RRRRuccuuccuuRRR..','..RRRRuuccuuccuRRR..','..RRRRucuuccuucRRR..','..RRRRuuccuuccuRRR..','..RRRRcuuccuuccRRR..','..RRRRuccuuccuuRRR..','..RRRRuuccuuccuRRR..','..RRRRucuuccuucRRR..','..RRRRuuccuuccuRRR..','..RRRucuuccuuccuRR..','.uucuucuucuucuuccuu.','uuuuuuuuuuuuuuuuuuuu','.uuuuuuuuuuuuuuuuuu.','....................','....................','....................','....................','....................','....................','....................','....................'],
['....RRRRRRRRRRRR....','...RRRRRRRRRRRRRR...','..RRRRcuuccuuccRRR..','..RRRRuccuuccuuRRR..','..RRRRuuccuuccuRRR..','..RRRRucuuccuucRRR..','..RRRRuuccuuccuRRR..','..RRRRcuuccuuccRRR..','..RRRRuccuuccuuRRR..','..RRRRuuccuuccuRRR..','..RRRRucuuccuucRRR..','..RRRRuuccuuccuRRR..','..RRRRcuuccuuccRRR..','..RRRRuccuuccuuRRR..','..RRRRuuccuuccuRRR..','..RRRRucuuccuucRRR..','..RRRuuccuuccuucRR..','.ucuucuucuucuucuuuc.','uuuuuuuuuuuuuuuuuuuu','.uuuuuuuuuuuuuuuuuu.','....................','....................','....................','....................','....................','....................','....................','....................']] };
SPRITES.lm_mushroom = [
'....eeee....','..eeeeeeee..','.eeweeeewee.','eeeeeweeeeee','eweeeeeeeewe','eeeeeeweeeee','.eeeeeeeeee.','....nnnn....','....nnnn....','....nnnn....','....nnnn....','...nnnnnn...','............','............'];
SPRITES.lm_rock = [
'....rrrr....','..rrrrrrrr..','.rrrRrrrrrr.','rrrrrrrrRrrr','RrrRrrrrrrrR','RRRRRRRRRRRR','............','............'];
SPRITES.lm_dskull = [
'...nnnnnnn......','..nnnnnnnnnn....','.nnnnnnnnnnnnn..','nnn0nnnnn0nnnnnn','nn000nnn000nnnnn','nnnnnnnnnnnnnnn.','nnnnnnnnnnnnnn..','nnnnnnnnnnnn....','.nnnnnnnnnnn....','.nn.nn.nn.nn....','..n..n..n..n....','................'];
SPRITES.lm_totem = [
'..eeeeee..','.eeeeeeee.','.ee0ee0ee.','.eeeeeeee.','.eeenneee.','..yyyyyy..','.yyyyyyyy.','.yy0yy0yy.','.yyyyyyyy.','.yyynnyyy.','..uuuuuu..','.uuuuuuuu.','.uu0uu0uu.','.uuuuuuuu.','.uuunnuuu.','..bbbbbb..','..bbbbbb..','..bbbbbb..','..bbbbbb..','..bbbbbb..','..bbbbbb..','..bbbbbb..','.BBBBBBBB.','..........'];
SPRITES.lm_tree = [
'.....gggggg.....','...gggggggggg...','..ggglggggglgg..','.gggggggggggggg.','.ggggglggggggggg','ggglgggggggglggg','gggggggggggggggg','.ggggggglgggggg.','..gggggggggggg..','...ggggggggggg..','.....gggggg.....','......bbbb......','......bbbb......','......bbbb......','......bbbb......','......bbbb......','......bbbb......','......bbbb......','......bbbb......','......bbbb......','.....BBBBBB.....','................','................','................'];
SPRITES.lm_fern = [
'.....g......','....gg.g....','...ggg.gg...','g..gg.gg.g..','gg.g.gg.gg..','.gggggg.g...','..gggggg....','...gggg.....','....gg......','....gg......'];
SPRITES.lm_nest = [
'....nn..nn....','...nnnnnnnn...','..bnnnnnnnnb..','.bbbnnnnnnbbb.','bbbbbbbbbbbbbb','.bbbbbbbbbbbb.','..bbbbbbbbbb..','..............'];
SPRITES.lm_campfire = { frames: [[
'............','.....x......','....xxx.....','....xox.....','...xxoxx....','...xooxx....','..xxooyox...','..xooyyox...','.xxooyyoxx..','.xooyyyoxx..','..xooooox...','.bbbbbbbbbb.','bbbBBbbBBbbb','.bbbb..bbbb.'],
['............','............','......x.....','.....xxx....','....xxox....','...xxoxxx...','...xooxxx...','..xxooyoxx..','..xooyyoox..','.xxooyyooxx.','..xxooooxx..','.bbbbbbbbbb.','bbbBBbbBBbbb','.bbbb..bbbb.']] };
SPRITES.lm_stage = [
'..RRRRRRRRRRRRRRRRRRRRRRRRRR....','..RRRRRRRRRRRRRRRRRRRRRRRRRR....','...RRRR......RRRR......RRRR.....','...RRRR......RRRR......RRRR.....','...RRRR......RRRR......RRRR.....','...RRRR......RRRR......RRRR.....','...RRRR......RRRR......RRRR.....','...RRRR......RRRR......RRRR.....','...RRRR......RRRR......RRRR.....','...RRRR......RRRR......RRRR.....','...RRRR......RRRR......RRRR.....','..rrrrrrrrrrrrrrrrrrrrrrrrrrrr..','.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.','.rrrrrrrrrrrrrrrrrrrrrrrrrrrrrr.','.RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR.','................................','................................','................................'];
SPRITES.lm_geyser = { frames: [[
'.......c........','......cc........','.....ccwc.......','.....cwcc.......','......cc........','......cc........','......cc........','......cc........','.....RccR.......','....RRRRRR......','...RRRRRRRR.....','..RRRRRRRRRR....','................','................','................','................'],
['................','................','......c.........','......cc........','.....ccwc.......','.....cwcc.......','......cc........','......cc........','.....RccR.......','....RRRRRR......','...RRRRRRRR.....','..RRRRRRRRRR....','................','................','................','................']] };
SPRITES.lm_bones = [
'n..............n','nn............nn','.nnnnnnnnnnnnnn.','nn............nn','n..............n','......nnnn......','.....n....n.....','................'];
SPRITES.lm_cage = [
'..bbbbbbbbbbbb..','.bbbbbbbbbbbbbb.','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bb.b.b.b.b.b.bbb','bbbbbbbbbbbbbbbb','bbbbbbbbbbbbbbbb','................'];
SPRITES.lm_cloud = [
'.......4444.............','....44444444444.........','..4444444444444444......','.444444444444444444444..','444444444444444444444444','.4444444444444444444444.','...44444444444444444....','........................'];
SPRITES.lm_bush = [
'....gggggg....','..gggggglggg..','.ggglgggggggg.','gggggggggglggg','ggglgggggggggg','.gggggglggggg.','..GGGGGGGGGG..','..............'];
SPRITES.lm_village = [
'..........tt............tt......','........tttttt........tttttt....','......tttttttttt....tttttttttt..','....tttttttttttttt.tttttttttttt.','...bbbbbbbbbbbbbb...bbbbbbbbbb..','...bbbbbb00bbbbbb...bbb00bbbbb..','...bbbbbb00bbbbbb...bbb00bbbbb..','...bbbbbbbbbbbbbb...bbbbbbbbbb..','..........x.....................','.........xox....................','........xooox...................','.......bbbbbbb..................','................................','................................','................................','................................','................................','................................','................................','................................'];
SPRITES.lm_crater = [
'........................','....RRRRRRRRRRRRRRRR....','..RRRcccccccccccccRRR...','.RRcccuuuuuuuuuuucccRR..','.RRccuuuuuuuuuuuuuccRR..','.RRRcccuuuuuuuuucccRRR..','..RRRRcccccccccccRRRR...','....RRRRRRRRRRRRRRR.....','........................','........................'];
SPRITES.lm_pillar = [
'.rrrrrr.','rrrrrrrr','.rRrrrr.','.rrrrRr.','.rrRrrr.','.rrrrrr.','.rRrrrr.','.rrrrRr.','.rrrrrr.','.rrRrrr.','.rrrrrr.','.rrrrrr.','.RRRRRR.','RRRRRRRR','........','........'];
SPRITES.lm_egg_big = [
'.....nnnnnn.....','...nnnnnnnnnn...','..nnnngnnnnnnn..','..nnnnnnnnngnn..','.nnngnnnnnnnnnn.','.nnnnnnnnnnnnnn.','.nnnnnnngnnnnnn.','.nnngnnnnnnnnnn.','..nnnnnnnnnngn..','..nnnnnnnnnnnn..','...nnnnnnnnnn...','.....nnnnnn.....','................','................'];
SPRITES.lm_grass = ['..g..g..','.gg.gg.g','gggggggg'];
SPRITES.lm_lavapool = { frames: [[
'......xxxxxxxxxx........','...xxxxooxxxxxxxxxx.....','.xxxxxxxxxxoyoxxxxxxx...','xxxoyoxxxxxxxxxxxxxxxx..','.xxxxxxxxxxxxxxxxoxxx...','...xxxxxxxxoyxxxxxxx....','......xxxxxxxxxxx.......','........................'],
['......xxxxxxxxxx........','...xxxxxxxxxxoxxxxx.....','.xxxxoyoxxxxxxxxxxxxx...','xxxxxxxxxxxxxoyoxxxxxx..','.xxxoxxxxxxxxxxxxxxxx...','...xxxxxxxoyoxxxxxxx....','......xxxxxxxxxxx.......','........................']] };
