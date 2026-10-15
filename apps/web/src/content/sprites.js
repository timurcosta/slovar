// Пиксельные спрайты боссов и предметов: строки символов + палитры.

export const SPR = {
  angelika: `
.......YYYYYY.......
......Y......Y......
.......YYYYYY.......
.......HHHHHH.......
......HHHHHHHH......
.....HHSSSSSSHH.....
.....HSWESSWESH.....
.....HSRSSSSRSH.....
.....HHSSMMSSHH.....
.....HH.SSSS.HH.....
OO...HTTTTTTTTH...OO
OLO..TTTTTTTTTT..OLO
OLLO.STTTTTTTTS.OLLO
.OLLOSTTTTTTTTSOLLO.
..OLO.TTTTTTTT.OLO..
...O..TTTTTTTT..O...
.....TTTTTTTTTT.....
......SS....SS......
.....GGG....GGG.....`,
  olesya: `
....HHHHHHHH....
...HHHHHHHHHH...
..HHHHHHHHHHHH..
..HHSSSSSSSSHH..
..HSGGSSSSGGSH..
..HGWEGGGGWEGH..
..HSGGSSSSGGSH..
..HHSRSMMSRSHH..
...HSSSSSSSSH...
...H..SSSS..H...
.....PPTTPP.....
...PPPPTTPPPP...
..PPPPPTTPPBBBB.
..SPPPPPPPPBDDB.
....PPPPPPSBBBB.
....KKKKKKKK....
.....SS..SS.....
....LLL..LLL....`,
  krakoz: `
...F..FF..F.....
..FFFFFFFFFFF...
.FFFFFFFFFFFFF..
.FFFFWWWWWWFFFF.
FFFFWWWKKWWWFFFF
FFFFWWWKKWWWFFFF
.FFFFWWWWWWFFFF.
FFFFFFFFFFFFFFFF
FFFFFFMMMMFFFFFF
.FFFFFMRRMFFFFF.
.FFFFFFMMFFFFFF.
..FFFFFFFFFFFF..
.D.DFFFFFFFFD.D.
...DD.DDDD.DD...`,
  ralina: `
.....HHHHHH.....
...HHHHHHHHHH...
..HHHHHHHHHHHH..
..HHHSSSSSSHHH..
..HHSSSSSSSSHH..
..HHSWESSWESHH..
..HHSRSSSSRSHH..
..HHSSSMMSSSHH..
..HHHSSSSSSHHH..
..HHH.SSSS.HHH..
..HH.CCTTCC.HH.P
...CCCCTTCCCC.P.
..YYCCCTTCCCCSP.
..YYCCCTTCCC.S..
....CCCCCCCC....
....KKKKKKKK....
.....SS..SS.....
....LLL..LLL....`,
  blot: `
......BBBB......
....BLLBBBBB....
...BLBBBBBBBB...
..BBBBBBBBBBBB..
..BBWWBBBBWWBB..
.BBBWKBBBBWKBBB.
.BBBWWBBBBWWBBB.
BBBBBBBBBBBBBBBB
BBBBBKKKKKKBBBBB
.BBBBKRRRRKBBBB.
.BBBBBKKKKBBBBB.
..BBBBBBBBBBBB..
.B.BBBBBBBBBB.B.
B...BB.BB.BB...B
....B..B...B....
.......B........`,
  slime: `
......GGGG......
....GGGGGGGG....
...GGLLGGGGGGG..
..GGLGGGGGGGGGG.
..GGGWWGGGWWGGG.
.GGGGWKGGGWKGGGG
.GGGGGGGGGGGGGGG
.GGGGGKKKKKGGGGG
GGGGGGGGGGGGGGGG
GGDGGGGGDGGGGDGG
.DD.DDD.DDDD.DD.`,
  two: `
...RRRRRRRR...
..RRRRRRRRRR..
.RRKRRRRRRKRR.
.RRWKRRRRKWRR.
.RRWWRRRRWWRR.
.RRRRKKKKRRRR.
.RRR......RRR.
..........RRR.
.........RRRR.
........RRRR..
.......RRRR...
......RRRR....
.....RRRR.....
....RRRR......
...RRRR.......
..RRRRRRRRRRR.
..RRRRRRRRRRR.
...K.......K..
..KK......KK..`,
  bat: `
P..............P
PP............PP
PPP...D..D...PPP
PPPP..DDDD..PPPP
PPPPPDDDDDDPPPPP
PPPPDDRDDRDDPPPP
.PPPDDDDDDDDPPP.
..PPPDWDDWDPPP..
...PP.DDDD.PP...
....P..DD..P....`,
  robot: `
.......Y........
.......D........
....MMMMMMMM....
....MDDDDDDM....
....MDRDDRDM....
....MDDDDDDM....
....MMCCCCMM....
.....MMMMMM.....
..MMMMMMMMMMMM..
.DMMDDMMMMDDMMD.
.DMMDYDMMDYDMMD.
.D.MMMMMMMMMM.D.
...MMMMMMMMMM...
....DD....DD....
....DD....DD....
...DDD....DDD...`,
  spider: `
.K............K.
..K..........K..
K..K..KKKK..K..K
.K..KKKKKKKK..K.
..KKKKPPKKKKKK..
....KRRKKRRK....
..KKKKKKKKKKKK..
.K.KKKKWWKKKK.K.
K..KKKKKKKKKK..K
..K.KKKKKKKK.K..
.K...KKKKKK...K.
K......KK......K`,
  alien: `
...G........G...
....G......G....
.....GGGGGG.....
...GGGGGGGGGG...
..GGBBBGGBBBGG..
..GGBWBGGBWBGG..
..GGBBBGGBBBGG..
...GGGGGGGGGG...
....GGGKKGGG....
.....GGGGGG.....
......PPPP......
....PPPPPPPP....
...GPPPPPPPPG...
...G.PPPPPP.G...
.....PP..PP.....
....GGG..GGG....`,
  skeleton: `
.....WWWWWW.....
....WWWWWWWW....
....WKKWWKKW....
....WKRWWRKW....
....WWWKKWWW....
.....WKWKWKW....
......WWWWW.....
.......WW.......
...WWWWWWWWWW...
..W..W.WW.W..W..
..W..WWWWWW..W..
.....W.WW.W.....
......WWWW......
......W..W......
......W..W......
.....WW..WW.....`,
  ghost: `
.....WWWWWW.....
...WWWWWWWWWW...
..WWWWWWWWWWWW..
..WWKKWWWWKKWW..
.WWWKKWWWWKKWWW.
.WWWWWWWWWWWWWW.
.WWWWWKKKKWWWWW.
.WWWWKLLLLKWWWW.
.WWWWWKKKKWWWWW.
.WWWWWWWWWWWWWW.
.WWWWWWWWWWWWWW.
.LWWWWWWWWWWWWL.
.LLWWWWWWWWWWLL.
.L.LLWW.WWLL.L..
...L..L..L..L...`,
  mummy: `
.....WWWWWW.....
....WBWWWWBW....
....WWWBWWWW....
....WYKWWKYW....
....BWWWWWWB....
.....WWBBWW.....
...WWWWWWWWWW...
..WBWWBWWBWWBW..
.WW.WWWWBWWW.WW.
WW..WBWWWWBW..WW
....WWWWWWWW....
....WWB..BWW....
....WWW..WWW....
...BWWW..WWWB...`,
  pirate: `
....HHHHHHHH....
...HHHHXXHHHH...
..HHHHHXXHHHHH..
.HHHHHHHHHHHHHH.
....SSSSSSSS....
....SEEESSKS....
....SEESSSSS....
....SSSSNSSS....
....BBBBBBBB....
.....BBRRBB.....
......BBBB......
...CCCCCCCCCC...
..CCCYCCCCYCCC..
..S.CCCCCCCC.G..
....KK....KK....
...KKK....DD....`,
  book: `
..RRRRRRRRRRRR..
.RRRRRRRRRRRRRR.
.RRYYRRRRRRYYRR.
.RRYKRRRRRRKYRR.
.RRRRRRRRRRRRRR.
.RWWWWWWWWWWWWR.
.RKTKTKTKTKTKTR.
.RKKKKKKKKKKKKR.
.RTKTKTKTKTKTKR.
.RWWWWWWWWWWWWR.
.RRRRRRRRRRRRRR.
..RRRRRRRRRRRR..
...K........K...
..KK........KK..`,
  zombie: `
....HHHHHHHH....
...HHGHHHHGHH...
...GGGGGGGGGG...
...GWRGGGGWRG...
...GGGGGGGGGG...
...GGGKKKKGGG...
...GGGKGGKGGG...
....GGGGGGGG....
.GGGTTTTTTTTGGG.
.G..TTTGTTTT..G.
....TTTTTGTT....
....TT.TTTTT....
....PPPPPPPP....
....PPP..PPP....
....PPP..PPP....
...KKKK..KKKK...`,
  wizard: `
.......P........
......PPP.......
.....PPYPP......
....PPPPPPP.....
...PPPPPPPPP..O.
..PPPPPPPPPPP.OO
....SSSSSSS...B.
....SKSSSKS...B.
....SSSSSSS...B.
....WWWWWWW...B.
...PWWWWWWWPPPB.
..PPPWWWWWPPPSB.
..PPPPWWWPPPP.B.
..PPPPPPPPPPP.B.
.PPPPPPPPPPPPPB.
.PPYPPPPPPPYPPB.`,
  dragon: `
..H............H..
..HH..........HH..
...HGGGGGGGGGGH...
..GGGGGGGGGGGGGG..
.GGGYYGGGGGGYYGGG.
.GGGYKGGGGGGKYGGG.
AGGGGGGGGGGGGGGGGA
AAGGGGGGGGGGGGGGAA
AAGGGNNGGGGNNGGGAA
AAAGGGGGGGGGGGGAAA
A..GTGGTGGTGGTG..A
...GGGGGGGGGGGG...
....GGGGGGGGGG....
.....GGFFFFGG.....
......GGFFGG......
........FF........`,
  octopus: `
.....PPPPPP.....
...PPPPPPPPPP...
..PPPPPPPPPPPP..
..PPWWPPPPWWPP..
..PPWKPPPPWKPP..
..PPPPPPPPPPPP..
..PPPPKKKKPPPP..
...PPPPPPPPPP...
..P.PP.PP.PP.P..
.P..P..PP..P..P.
.P.P...PP...P.P.
P..P..P..P..P..P
P...P.P..P.P...P`,
  snowman: `
.....HHHHHH.....
.....HHHHHH.....
....HHHHHHHH....
.....WWWWWW.....
....WWKWWKWW....
....WWWWOOOO....
....WWKKKKWW....
.....WWWWWW.....
....RRRRRRRR....
...WWWWRRWWWW...
.D.WWWWWKWWWWW.D
D.WWWWWWWWWWWWD.
..WWWWWWKWWWWWW.
..WWWWWWWWWWWWW.
...WWWWWKWWWWW..
....BWWWWWWWWB..`,
  cactus: `
.......FF.......
......GGGG......
.....GGGGGG.....
..Y..GKGGKG..Y..
.GG..GGGGGG..GG.
.GGY.GKKKKG.YGG.
.GGGGGGGGGGGGGG.
..GGGGGGGGGGGG..
.....GGYGGG.....
.....GGGGYG.....
....PPPPPPPP....
....PDPPPPDP....
.....PPPPPP.....
.....PPPPPP.....`,
  pumpkin: `
.......GG.......
......GG........
...OOOOOOOOOO...
..OODOOOODOOOO..
.OOODOOOODOOOOO.
.OOKKOOOOOKKOOO.
.OOKYOOOOOKYOOO.
OOOOOOOKOOOOOOOO
OOOOOOOOOOOOOOOO
OOKYKYKYKYKYKOOO
OOOKKKKKKKKKOOOO
.OOODOOOODOOOOO.
..OODOOOODOOOO..
...OOOOOOOOOO...`,
  ufo: `
......CCCC......
.....CGGGGC.....
.....CGKKGC.....
....CCGGGGCC....
..MMMMMMMMMMMM..
.MMDDMMDDMMDDMM.
MMMYMMMYMMMYMMMM
.MMMMMMMMMMMMMM.
...DDDDDDDDDD...
.....BBBBBB.....
....B.BBBB.B....
...B..BBBB..B...
..B...BBBB...B..`,
  goblin: `
.G............G.
.GG..GGGGGG..GG.
..GGGGGGGGGGGG..
...GGRKGGRKGG...
...GGGGGNGGGG...
...GGWKWKWKGG...
....GGGGGGGG....
...BBBBBBBBBB.D.
..GBBBBBBBBBBGD.
..G.BBBYBBBB.GD.
....BBBBBBBB.DD.
....GG....GG....
...GGG....GGG...`,
  shark: `
.......MM.......
......MMM.......
....SSSSSSS.....
..SSSSSSSSSSS..S
.SSRSSSSSSSSSSSS
SSSSSSSSSSSSSSS.
KTKTKTSSSSSSSSSS
.WWWWWWWWWSSSS.S
..WWWWWWWWSSS...
....WWWWW.SS....
...........S....`,
  king: `
...Y.Y.YY.Y.Y...
...YYYYYYYYYY...
...YRYYYYYYRY...
..HH.PPPPPP.HH..
.HH.PPPPPPPP.HH.
....PRKPPKRP....
....PPPPPPPP....
....PKWKWKWP....
.....PPPPPP.....
..CCCCCCCCCCCC..
.CCDDDDDDDDDDCC.
.CCDDXDDDDXDDCC.
.CCDDDXDDXDDDCC.
.CCDDDDXXDDDDCC.
.CCDDDXDDXDDDCC.
CCCDDXDDDDXDDCCC
CCC.DD....DD.CCC`,
  // новые боссы
  eraser: `
.....QQQQQQQQQ..
....QQQQQQQQQQD.
...QQQQQQQQQQDD.
..PPPPPPPPPPPDD.
..PPKKPPPPPKPDD.
..PKPPPPPPKPKDD.
..PWWWPPPWWWPDD.
..PWEEPPPWEEPDD.
..PRPPPPPPMPRDD.
..PPPMMMMMMPPDD.
..PPPPTTPPPPPDD.
..CCCCCCCCCCCNN.
X.BBBBBBBBBBBNN.
..BBBBBBBBBBBNN.
..BBBBBBBBBBBN.X
.X.BBBBBBBBBBN..
....KK....KK..X.
...KKK...KKK....`,
  jelly: `
.O...DDDDDD.....
O.ODDPPPPPPDD...
.O.DPPLLPPPPPD..
.DPPLHLPPPPPPPD.
.DPPLLPPPPPPPPD.
DPPPEEPPPPEEPPPD
DPPEWEEPPEWEEPPD
DPPEEEEPPEEEEPPD
DPPPEEPPPPEEPPPD
DPRPPPPMMPPPPRPD
.DDPPPPPPPPPPDD.
.UUTUUTUUTUUTUU.
..TT.TT..TT.TT..
.TT.TT....TT.TT.
..TT.TT..TT.TT..
.TT.TT....TT.TT.
..T..T....T..T..
.T..T......T..T.`,
  chameleon: `
...DDDD...........
..DGGGGD..........
.DGGGGGGDDDD......
.OOODGGGGGGGGD....
OGGGOGGYGGGYGGD...
OEEWOGGGGGGGGYGD..
OEWWOGGGYGGGGGGG..
.OOOGGGGGGGGD...G.
GGGGGLLLLLLLD..G.G
KKKKGLLLLLLD..G.GG
TTGGGGGGGGGD..G..G
.TT.GD..GD.....GG.
BBBBGDBBGDBBBB....`,
  bee: `
...K........K...
....K......K....
.CC..KYYYYK..CC.
CLLC.YYYYYY.CLLC
CLLLCYYYYYYCLLLC
.CLLKKYYYYKKLLC.
..CYYYKYYKYYYC..
..YYYWWYYWWYYY..
..YYYWEYYEWYYY..
..YYYYYMMYYYYY..
..KKKKKKKKKKKK..
.OYYYYYYYYYYYYO.
..KKKKKKKKKKKK..
...YYYYYYYYYY...
....KKKKKKKK....
......YYYY......
.......SS.......
.......S........`,
  ninja: `
Y...............
.H..............
..H.YNNNNNNN....
...YNNNNNNNNN...
..YNNNNNNNNNNN..
...RRRRRRRRRRRR.
...NSSKKSKKSSNRR
...NSWEESEEWSN.R
...NNNNNNNNNNN.R
....NNNNNNNNN...
..NNNNNNNNNNNN..
.NNNNVNNNNVNNNN.
.NNSVVVVVVVVSNN.
.NNNNNNNNNNNNNN.
..NRRRRRRRRRRN..
...NNNNNNNNNN...
...DDDD..DDDD...
..SSDD....DDSS..`,
  golem: `
.....LLLLLLL.....
....LSSSSSSSD....
....SDDSSSDDD....
....SEEDSDEED....
....SSSOYOSSD....
.LLLLDDSSSDDLLLL.
LSSSDSSOSSSSDSSSD
LSOSDSSYOSSSDSSOD
LOSSDSSSOYSSDSOSD
LSSSDSSSSOSSDOSSD
LSSSDSSSOSSSDSSSD
LSOSSDDDDDDDSSOSD
DDDDD.SSSSS.DDDDD
.....LSSDSSD.....
....LSSD.LSSD....
....SOSD.SOSD....
...DDDDD.DDDDD...`,
  mech: `
.R.R.........R.R.
DLDLD.......DLDLD
DMMMD.DDDDD.DMMMD
DYDYDDMMMMMDDYDYD
DDDDDMVVVVVMDDDDD
.MMMDMVVVVVMDMMM.
LMMMDDMMMMMDDMMML
LMDMLMMCCCMMLMDML
LMDMLMCMMMCMLMDML
DDDDLMMCCCMMLDDDD
DCD.LMMMMMMML.DCD
....DDDYKYDDD....
....LMMD.DMML....
....LCMD.DMCL....
....LMMD.DMML....
...LMMMD.DMMML...
...DDDDD.DDDDD...`,
  cyclops: `
........H.......
.......HH.......
....SSSSSSSS....
...SSSWWWWSSS...
..SSSWWWWWWSSS..
..SSWWIIIIWWSSCC
..SSWWIXEIWWSCCC
..SSWWIEEIWWSCCK
..SSWWIIIIWWSCKC
..SSSWWWWWWSSKC.
...SSSLLLLSSSK..
...SSMTMMTMSSK..
..SSSSMMMMSSSK..
.SBBNBBBBNBBSS..
.S.BBBBNBBBB....
...BBNBBBBBN....
....SS...SS.....
...SSS...SSS....`,
  shadow: `
...Q.Q.QQ.Q.Q...
...QQQQQQQQQQ...
...QGQQQQQQGQ...
..PP.KKKKKK.PP..
.PK.PKKKKKKK.KP.
....PGGKKGGK....
....PKWKKWKK....
....PFKKKKFK....
.....PFFFFK.....
..PDDDDDDDDDDD..
.PDKKKKKKKKKKDD.
.PDKKKKKKKKKKDD.
.PDKKKKKKKKKKDD.
PDDKKKKKKKKKKDDD
DD.KKDKKKDKKK.DD
D..PK.PKKP.KP..D
...P...PP...P...`,
  // вторые формы боссов (FORMS в bosses.js): крупнее и с другим силуэтом
  wizard2: `
.........P........
........PP........
.......PPP........
......PPYPP.......
H.....PPPPP.....H.
HH...PPPPPPP...HH.
.HH.PPPPPPPPP.HH..
..HQQQQQQQQQQQH...
.QQQQQQQQQQQQQ.GG.
.....SSSSSSS..GOXG
.....SKSSSKS..GOOG
.....SSSSSSS...GG.
.....WWWWWWW...S..
...DPWWWWWWWPDDS..
..DDPPWWWWWPPDD...
..DDDPPWWWPPDDD...
.DDDDDPPWPPDDDDD..
.DDYDDDDDDDDDYDD..
DDDDDDDDDDDDDDDDD.`,
  dragon2: `
B..................B
BB....Y......Y....BB
BAB...YF....FY...BAB
BAAB...HF..FH...BAAB
BAAAB..HGGGGH..BAAAB
BAAAAGGGGGGGGGGAAAAB
BAAAGGEEGGGGEEGGAAAB
BAAAGGEKGGGGKEGGAAAB
.BAAGGGGGGGGGGGGAAB.
.BAAGGGNNGGNNGGGAAB.
..BAGGGGGGGGGGGGAB..
..B.GTGGTGGTGGTG.B..
....GGGGGGGGGGGG....
.....GGGGGGGGGG.....
......GGFFFFGG......
.......FFYYFF.......
......FFYYYYFF......
.......FFFFFF.......`,
  king2: `
..Y..Y..Y..Y..Y.....
..YY.YYYYYYY.YY...O.
..YYYYYYYYYYYYY..OZO
..YRYYBYRYBYYRY...O.
..YYYYYYYYYYYYY...Y.
HH..PPPPPPPPP..HH.Y.
.HH.PRKPPPKRP.HH..Y.
....PPPPPPPPP.....Y.
....PKWKWKWKP.....Y.
.....PPPPPPP......Y.
.YYCCCCCCCCCCCYY..Y.
YYCCDDDDDDDDDCCYYPP.
.CCDDXDDDDDXDDCC..Y.
.CCDDDXDDDXDDDCC..Y.
CCCDDDDXDXDDDDCCC.Y.
CCCDDDDDXDDDDDCCC.Y.
CCCDDDDXDXDDDDCCC.Y.
CCCDDDXDDDXDDDCCC...
CCC.DD.....DD.CCC...`,
  cactus2: `
......FF..FF......
.....FFFFFFFF.....
....FFFFYYFFFF....
.....FFFYYFFF.....
......FFFFFF......
...W..GGGGGG..W...
.W..WGGGGGGGGW..W.
GG..GKGGGGGGKG..GG
GGW.GGKGGGGKGG.WGG
GGG.GHEGGGGEHG.GGG
WGG.GGGGGGGGGG.GGW
.GGGGGGGKKGGGGGGG.
..GGGGGKGGKGGGGG..
....WGGGGGGGGW....
....GGGGGGGGGG....
...PPPPPPPPPPPP...
...PDPPPPPPPPDP...
....PPPPPPPPPP....
....PPPPPPPPPP....`,
  spider2: `
.......Y.YY.Y.......
...LL..YYYYYY..LL...
..L..L.YGYYGY.L..L..
.L....KKRKKRKK....L.
.L...KRKKKKKKRK...L.
L.LL.KKRRKKRRKK.LL.L
.L..LKKRRKKRRKKL..L.
.L...KKKKWWKKKK...L.
L.....KKWKKWKK.....L
..L..KKKKKKKKKK..L..
.L.LKKLKPPPPKLKKL.L.
.L..KLKKKPPKKKLK..L.
L...KKKKKPPKKKKK...L
..LLKKKKPPPPKKKKLL..
.L...KKKKKKKKKK...L.
L......KKKKKK......L`,
  shadow2: `
.....F..F..F..F.....
.....FF.FFFF.FF.....
.....QFQFQQFQFQ.....
P....QQQQQQQQQQ....P
PP...QGQQQQQQGQ...PP
PDP.PKKKKKKKKKKP.PDP
PDDPPKGGKKKKGGKPPDDP
PDDDPKGWKKKKWGKPDDDP
PDDDDPKKMMMMKKPDDDDP
PDDDDDPKKKKKKPDDDDDP
.PDPDDKKKKKKKKDDPDP.
..P.PDKKKKKKKKDP.P..
....PKKKKKKKKKKP....
...PKKKKKKKKKKKKP...
...PKKKKKKKKKKKKP...
..PKKKKKKKKKKKKKKP..
..PKKPKKKPPKKKPKKP..
...PK.PKP..PKP.KP...
....P...P..P...P....`,
  // малыши для подлянок боссов и стаканчик для игры в напёрстки (без моргания)
  m_plane: `
.......LW
.....LWWW
...LWWWB.
.LWWWWB..
LWWWBBB..
...BBN...
...BN....
...N.....`,
  m_bee: `
...CC.CC
...CLCLC
.KYKYKY.
YEYKYKYS
YYYKYKY.
.YYKYKY.`,
  m_crumb: `
..PPPQ.
.PPQQPD
PWEPWEP
PPPPPPD
.PPMPPD
..DDDD.`,
  m_spider: `
L.......L
.L.KKK.L.
..LKKKL..
LLKRKRKLL
..KKKKK..
.L.KKK.L.
L..L.L..L`,
  m_wisp: `
..PKKP..
.PKKKKP.
PKGKKGKP
PKGKKGKP
PKKKKKKP
.PKKKKP.
..PK.KP.
.P..P..P`,
  m_blob: `
...B...
..BBB..
.BLBBB.
BWKBWKB
BBBBBBB
.BBBBB.
..BBB..`,
  cup: `
...RRRRR...
...RLRRD...
..WWWWWWW..
..RLRRRRD..
..RLRRRRD..
.WWWWWWWWW.
.RLRRRRRRD.
.RLRRRRRRD.
RRRRRRRRRRR
.DDDDDDDDD.`,
  lep: `
....WWWW....
...WWWWWW...
..WWWWWWWW..
.BBCCWWCCBB.
BBDBBBBBBDBB
BBBBBDBBBBBB
.BBBBBBBDBB.
..BBBBBBBB..`,
  chest: `
..BBBBBBBB..
.BYYYYYYYYB.
BYYBBBBBBYYB
BBBBBBBBBBBB
BBBBBGGBBBBB
BBBBBGGBBBBB
BBBBBBBBBBBB
BYYYYYYYYYYB
BBBBBBBBBBBB`,
  // открытый сундук: крышка откинута назад, изнутри свет
  chestOpen: `
.BBBBBBBBBB.
BYYYYYYYYYYB
BBBBBBBBBBBB
.W..W..W..W.
W.WWWWWWWW.W
..WGGGGGGW..
BBGGGGGGGGBB
BYYYYYYYYYYB
BBBBBGGBBBBB
BBBBBGGBBBBB
BBBBBBBBBBBB
BYYYYYYYYYYB
BBBBBBBBBBBB`,
};
export const PALS = {
  lep: { B: "#e0a050", D: "#a8642a", W: "#fff7e0", C: "#f0dcb0" },
  angelika: {
    Y: "#ffd23f",
    H: "#c98a3a",
    S: "#f2c7a5",
    W: "#ffffff",
    E: "#1b1b1b",
    R: "#f29aa8",
    M: "#d6476b",
    T: "#bcd4ff",
    O: "#5f7fb8",
    L: "#eef4ff",
    G: "#d9a400",
  },
  olesya: {
    H: "#241612",
    S: "#f2c7a5",
    G: "#3a2a5a",
    W: "#ffffff",
    E: "#1b1b1b",
    R: "#f29aa8",
    M: "#d6476b",
    P: "#7a4fd6",
    T: "#ffffff",
    B: "#c0283a",
    D: "#fff7e0",
    K: "#2a2238",
    L: "#5a2a3a",
  },
  krakoz: { F: "#8a5cf0", D: "#5b3aa8", W: "#ffffff", K: "#111111", M: "#2a1440", R: "#ff6b8a" },
  ralina: {
    H: "#3b2418",
    S: "#f2c7a5",
    E: "#1b1b1b",
    W: "#ffffff",
    R: "#f29aa8",
    M: "#d6476b",
    C: "#2a9d8f",
    T: "#ffffff",
    P: "#d62839",
    Y: "#ffd23f",
    K: "#2a2238",
    L: "#5a2a3a",
  },
  blot: { B: "#2f55c8", L: "#8aa5f2", W: "#ffffff", K: "#0b1640", R: "#e04f6a" },
  slime: { G: "#6fcf4a", L: "#b8f29a", W: "#ffffff", K: "#1f4a14", D: "#3f8f2a" },
  two: { R: "#d62839", W: "#ffffff", K: "#3a0a10" },
  bat: { P: "#6a3fb5", D: "#2a1a4a", R: "#ff3b3b", W: "#ffffff" },
  robot: { M: "#9aa7bd", D: "#4a5670", R: "#ff3b3b", Y: "#ffd23f", C: "#45d1e6" },
  cyber: { M: "#2a2f4a", D: "#ff4fd8", R: "#45d1e6", Y: "#ffd23f", C: "#45d1e6" },
  spider: { K: "#2a2238", P: "#d62839", R: "#ff3b3b", W: "#ffffff" },
  alien: { G: "#5cc95c", B: "#111111", W: "#ffffff", K: "#2b5e2b", P: "#7a4fd6" },
  skeleton: { W: "#e9e4d4", K: "#2a2a2a", R: "#ff3b3b" },
  ghost: { W: "#d3def5", L: "#8ea6d6", K: "#1d2f5c" },
  mummy: { W: "#efe6c8", B: "#b8a77a", Y: "#ffd23f", K: "#2a2a2a" },
  pirate: {
    H: "#1b1b1b",
    X: "#ffffff",
    S: "#f2c09a",
    E: "#111111",
    K: "#2a1a10",
    N: "#d9926b",
    B: "#7a4a26",
    R: "#b5485a",
    C: "#c0283a",
    Y: "#f0a000",
    G: "#9aa7bd",
    D: "#a8743f",
  },
  book: { R: "#8e1d2b", W: "#fff7e0", Y: "#ffd23f", K: "#1b1b1b", T: "#ffffff" },
  zombie: { H: "#2f3a2a", G: "#8fb07a", W: "#ffffff", R: "#d62839", K: "#2a3324", T: "#4a6fa5", P: "#6b4e31" },
  wizard: { P: "#3d2a6b", Y: "#ffd23f", S: "#9fb59a", K: "#ff3b3b", W: "#e6e6e6", B: "#6b4e31", O: "#45d1e6" },
  dragon: {
    G: "#2b9348",
    H: "#f0a000",
    Y: "#ffd23f",
    K: "#111111",
    N: "#1b5e30",
    T: "#ffffff",
    A: "#7fc8a9",
    F: "#ff7a1a",
  },
  octopus: { P: "#5b3fa0", W: "#ffffff", K: "#111111" },
  snowman: { H: "#1b1b1b", W: "#dde8fa", K: "#1b1b1b", O: "#ff7a1a", R: "#d62839", D: "#6b4e31", B: "#9fb3d9" },
  cactus: { G: "#3f9f4a", K: "#111111", Y: "#ffd23f", P: "#c0602a", D: "#8a3f1a", F: "#ff5a8a" },
  pumpkin: { O: "#ff8c1a", D: "#c96a10", K: "#2a1a0a", Y: "#ffd23f", G: "#3f8f2a" },
  ufo: { M: "#9aa7bd", D: "#4a5670", C: "#a8f0ff", G: "#5cc95c", K: "#111111", Y: "#ffd23f", B: "#9df58a" },
  goblin: {
    G: "#7fb84a",
    R: "#ff3b3b",
    K: "#111111",
    N: "#4f7a2a",
    W: "#ffffff",
    B: "#7a4a26",
    Y: "#ffd23f",
    D: "#6b4e31",
  },
  shark: { S: "#5f7fa6", W: "#e6eef8", K: "#1b1b1b", T: "#ffffff", R: "#ff3b3b", M: "#9aa7bd" },
  king: {
    Y: "#f0a000",
    R: "#ff3b3b",
    H: "#f2e6c9",
    P: "#7a4fd6",
    K: "#111111",
    W: "#ffffff",
    C: "#8e1d2b",
    D: "#2a2238",
    X: "#ff3b3b",
  },
  // новые боссы
  eraser: {
    Q: "#ffc2d4",
    P: "#ff8fb1",
    D: "#d65a85",
    C: "#9cc7ff",
    B: "#4a8fe0",
    N: "#2a5fa8",
    K: "#3a1a2a",
    W: "#ffffff",
    E: "#1b1b1b",
    M: "#8e1d2b",
    R: "#ff5a8a",
    T: "#ffffff",
    X: "#ffd6e2",
  },
  jelly: {
    D: "#d9559a",
    P: "#ff8cc6",
    L: "#ffd0e8",
    H: "#ffffff",
    W: "#ffffff",
    E: "#2a1438",
    M: "#8e1d4b",
    R: "#ff5a8a",
    T: "#5ff0d8",
    U: "#2bb5b0",
    O: "#c8f6ff",
  },
  chameleon: {
    G: "#5cc95c",
    D: "#2b8a3e",
    B: "#8a5a2b",
    L: "#c8f29a",
    Y: "#ffd23f",
    O: "#3f9f4a",
    W: "#ffffff",
    E: "#1b1b1b",
    K: "#1f4a24",
    T: "#ff5a8a",
  },
  bee: {
    Y: "#ffd23f",
    O: "#f0a000",
    K: "#1b1b1b",
    W: "#ffffff",
    E: "#1b1b1b",
    M: "#d62839",
    C: "#8fcfff",
    L: "#dff4ff",
    S: "#4a4a5a",
  },
  ninja: {
    N: "#2a2f5a",
    D: "#1a1d3a",
    V: "#5a4fa8",
    S: "#f2c7a5",
    K: "#1a1d3a",
    W: "#ffffff",
    E: "#1b1b1b",
    R: "#d62839",
    Y: "#ffd23f",
    H: "#8e1d2b",
  },
  golem: { L: "#948c99", S: "#6b6470", D: "#3e3842", O: "#ff7a1a", Y: "#ffd23f", E: "#ffb000" },
  mech: {
    M: "#8a96ab",
    L: "#c9d3e3",
    D: "#3a4258",
    V: "#45d1e6",
    C: "#45d1e6",
    R: "#ff3b3b",
    Y: "#ffd23f",
    K: "#1b1b1b",
  },
  cyclops: {
    S: "#8fd0a0",
    L: "#4f9a6a",
    H: "#f2e6c9",
    W: "#ffffff",
    I: "#3a7fd6",
    E: "#111111",
    X: "#ffffff",
    M: "#5a1a2a",
    T: "#ffffff",
    B: "#a8642a",
    N: "#6b3a1a",
    C: "#8a5a2b",
    K: "#5a3416",
  },
  shadow: { Q: "#8a5cf0", G: "#d9a6ff", W: "#ffffff", K: "#1a1026", D: "#2e1d4a", P: "#5a3a8a", F: "#b07ae0" },
  // вторые формы боссов (FORMS в bosses.js): крупнее и с другим силуэтом
  wizard2: {
    P: "#2a1d4f",
    Y: "#ffd23f",
    H: "#e6dcc0",
    Q: "#7a4fd6",
    S: "#8a9a86",
    K: "#ffe14a",
    W: "#cfcfd8",
    D: "#1a1430",
    G: "#a855f7",
    O: "#e0b0ff",
    X: "#ffffff",
  },
  dragon2: {
    G: "#1f7a3a",
    N: "#0f4220",
    H: "#3a1a1a",
    E: "#ffd23f",
    K: "#111111",
    T: "#ffffff",
    A: "#ff9a3a",
    B: "#8e1d2b",
    F: "#ff5a1a",
    Y: "#ffe14a",
  },
  king2: {
    Y: "#ffc21a",
    R: "#ff3b3b",
    B: "#45d1e6",
    H: "#f2e6c9",
    P: "#7a4fd6",
    K: "#111111",
    W: "#ffffff",
    C: "#8e1d2b",
    D: "#2a2238",
    X: "#ff3b3b",
    O: "#ff7ae0",
    Z: "#ffffff",
  },
  cactus2: {
    G: "#3f9f4a",
    K: "#103a18",
    H: "#ffffff",
    E: "#111111",
    W: "#fff4c0",
    F: "#ff4f9a",
    Y: "#ffd23f",
    P: "#c0602a",
    D: "#8a3f1a",
  },
  spider2: { K: "#2a2238", L: "#6a5a8a", Y: "#ffc21a", G: "#45d1e6", R: "#ff3b3b", P: "#d62839", W: "#ffffff" },
  shadow2: {
    F: "#d94fff",
    Q: "#8a5cf0",
    G: "#d9a6ff",
    W: "#ffffff",
    K: "#1a1026",
    D: "#2e1d4a",
    P: "#5a3a8a",
    M: "#b07ae0",
  },
  // малыши для подлянок боссов и стаканчик для игры в напёрстки (без моргания)
  m_plane: { W: "#ffffff", L: "#c9d3e3", B: "#8fcfff", N: "#4a8fe0" },
  m_bee: { Y: "#ffd23f", K: "#1b1b1b", E: "#1b1b1b", C: "#8fcfff", L: "#dff4ff", S: "#4a4a5a" },
  m_crumb: { P: "#ff8fb1", Q: "#ffc2d4", D: "#d65a85", W: "#ffffff", E: "#1b1b1b", M: "#8e1d2b" },
  m_spider: { K: "#4a3a5a", L: "#7a6a9a", R: "#ff3b3b" },
  m_wisp: { K: "#1a1026", P: "#5a3a8a", G: "#d9a6ff" },
  m_blob: { B: "#2f55c8", L: "#8aa5f2", W: "#ffffff", K: "#0b1640" },
  cup: { R: "#d62839", L: "#ff7a8a", D: "#8e1d2b", W: "#ffffff" },
  // палитры вторых форм для старых спрайтов: angelika, olesya, robot
  angelika2: {
    Y: "#ffe14a",
    H: "#36406a",
    S: "#e8c4ac",
    W: "#e0f4ff",
    E: "#1b1b1b",
    R: "#c98aa8",
    M: "#a8476b",
    T: "#4f63a0",
    O: "#ffe14a",
    L: "#7a8aaa",
    G: "#ffd23f",
  },
  olesya2: {
    H: "#2a1240",
    S: "#ecc8cc",
    G: "#2a1a40",
    W: "#ffffff",
    E: "#1b1b1b",
    R: "#ff8ad8",
    M: "#d6479b",
    P: "#b03cff",
    T: "#5ff3ff",
    B: "#ff4fd8",
    D: "#fff0ff",
    K: "#1a1030",
    L: "#3a1a5a",
  },
  cyber2: { M: "#6e7685", D: "#a8202e", R: "#ffb000", Y: "#ff3b3b", C: "#ff7a1a" },
  chest: { B: "#8a5a2b", Y: "#f0a000", G: "#ffd84a", W: "#fff3a0" },
  chest2: { B: "#4a5a7a", Y: "#c9d3e3", G: "#45d1e6", W: "#d6f3ff" },
  chest3: { B: "#a86400", Y: "#ffe27a", G: "#ff4fd8", W: "#ffffff" },
};
// per-boss "blink" frame: which palette keys get swapped (eyes close, lights flicker)
export const BLINK = {
  angelika: { E: "S", W: "S" },
  olesya: { E: "W" },
  krakoz: { W: "F", K: "F" },
  ralina: { E: "S", W: "S" },
  blot: { W: "B" },
  slime: { W: "G" },
  two: { W: "R" },
  bat: { R: "D" },
  robot: { R: "D", C: "M" },
  cyber: { R: "M", C: "M" },
  spider: { R: "K" },
  alien: { W: "B" },
  skeleton: { R: "K" },
  mummy: { Y: "W" },
  pirate: { K: "S" },
  book: { Y: "R" },
  zombie: { R: "W" },
  wizard: { K: "S", O: "B" },
  dragon: { Y: "G" },
  octopus: { W: "P" },
  snowman: { K: "W" },
  cactus: { F: "G" },
  pumpkin: { Y: "K" },
  ufo: { Y: "D", B: "C" },
  goblin: { R: "G" },
  shark: { R: "S" },
  king: { R: "P" },
  ghost: { K: "W" },
  // новые боссы и вторые формы
  eraser: { W: "P", E: "P" },
  jelly: { W: "P", E: "P" },
  chameleon: { W: "O", E: "O" },
  bee: { W: "Y", E: "Y" },
  ninja: { W: "S", E: "S" },
  golem: { E: "D" },
  mech: { V: "D" },
  cyclops: { W: "S", I: "S", E: "S", X: "S" },
  shadow: { G: "K", W: "K" },
  wizard2: { K: "S", X: "O" },
  dragon2: { E: "G" },
  king2: { R: "P", O: "Y" },
  cactus2: { E: "G", H: "G" },
  spider2: { R: "K" },
  shadow2: { G: "K", W: "K" },
  angelika2: { E: "S", W: "S" },
  olesya2: { E: "W" },
  cyber2: { R: "D", C: "M" },
};
