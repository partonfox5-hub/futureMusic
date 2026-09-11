// Original parametric patterns inspired by ordinary garment construction.
export const GARMENTS=[
{id:'top',name:'Linen camisole',slot:'top',kind:'surface',top:1.32,bottom:1.01,color:0xe4d6bb,fabric:'linen'},
{id:'tube',name:'Ribbed tube top',slot:'top',kind:'surface',top:1.285,bottom:1.035,color:0xe8cfc0,fabric:'rib'},
{id:'bikiniTop',name:'Triangle bikini top',slot:'top',kind:'surface',top:1.29,bottom:1.125,color:0x285b65,fabric:'swim'},
{id:'bandeau',name:'Bandeau bikini top',slot:'top',kind:'surface',top:1.27,bottom:1.13,color:0xa74861,fabric:'swim'},
{id:'briefs',name:'Cotton panties',slot:'underwear',kind:'surface',top:.935,bottom:.74,color:0xe6d9d2,fabric:'cotton'},
{id:'bikiniBottom',name:'Bikini bottoms',slot:'underwear',kind:'surface',top:.91,bottom:.75,color:0x285b65,fabric:'swim'},
{id:'jeans',name:'Straight leg jeans',slot:'bottom',kind:'surface',top:.98,bottom:.13,color:0x355876,fabric:'denim'},
{id:'shorts',name:'Denim shorts',slot:'bottom',kind:'surface',top:.98,bottom:.55,color:0x516f8c,fabric:'denim'},
{id:'skirt',name:'Wrap midi skirt',slot:'bottom',kind:'drape',top:.97,bottom:.42,flare:.28,color:0x628c88,fabric:'linen'},
{id:'dress',name:'A-line sundress',slot:'dress',kind:'dress',top:1.32,bottom:.39,flare:.32,color:0xb87865,fabric:'linen'},
{id:'slipDress',name:'Satin slip dress',slot:'dress',kind:'dress',top:1.32,bottom:.53,flare:.12,color:0x355052,fabric:'satin'}];

GARMENTS.push(
{id:'fieldShirt',name:'Field shirt',slot:'top',kind:'surface',top:1.43,bottom:.98,width:.65,color:0x62674c,fabric:'cotton'},
{id:'tacticalShirt',name:'Tactical long sleeve shirt',slot:'top',kind:'surface',top:1.43,bottom:.98,width:.65,color:0x252b34,fabric:'ripstop'},
{id:'redcoat',name:'Red wool tunic',slot:'top',kind:'surface',top:1.43,bottom:.89,width:.65,color:0xa73531,fabric:'wool'},
{id:'tornShirt',name:'Weathered cotton shirt',slot:'top',kind:'surface',top:1.42,bottom:.98,width:.65,color:0x738077,fabric:'cotton'},
{id:'streetShirt',name:'Streetwear shirt',slot:'top',kind:'surface',top:1.43,bottom:.97,width:.65,color:0xe4ded2,fabric:'cotton'},
{id:'suitJacket',name:'Tailored wool jacket',slot:'top',kind:'surface',top:1.43,bottom:.89,width:.65,color:0x343b48,fabric:'wool',pattern:'lapels'},
{id:'suitPants',name:'Tailored trousers',slot:'bottom',kind:'surface',top:.98,bottom:.09,width:.32,color:0x343b48,fabric:'wool'},
{id:'workPants',name:'Canvas work trousers',slot:'bottom',kind:'surface',top:.98,bottom:.11,width:.32,color:0x706755,fabric:'canvas'},
{id:'tacticalPants',name:'Tactical cargo trousers',slot:'bottom',kind:'surface',top:.98,bottom:.09,width:.32,color:0x252b34,fabric:'ripstop'},
{id:'laceBralette',name:'Floral lace bralette',slot:'top',kind:'surface',top:1.30,bottom:1.125,cut:'bikiniTop',color:0xb87285,fabric:'lace'},
{id:'laceBriefs',name:'Floral lace briefs',slot:'underwear',kind:'surface',top:.935,bottom:.74,cut:'briefs',color:0xb87285,fabric:'lace'},
{id:'satinCami',name:'Satin camisole',slot:'top',kind:'surface',top:1.32,bottom:1.01,cut:'top',color:0xd7b9ba,fabric:'satin'},
{id:'sleepShorts',name:'Striped sleep shorts',slot:'bottom',kind:'surface',top:.98,bottom:.62,color:0xe6bfd0,fabric:'cotton',pattern:'stripes'},
{id:'knitDress',name:'Rib knit lounge dress',slot:'dress',kind:'dress',top:1.32,bottom:.34,flare:.1,cut:'top',color:0xbaa28d,fabric:'rib'},
{id:'sportTop',name:'Sport support top',slot:'top',kind:'surface',top:1.31,bottom:1.09,color:0x465e69,fabric:'swim'},
{id:'leggings',name:'Stretch leggings',slot:'bottom',kind:'surface',top:.99,bottom:.09,width:.30,color:0x3e4553,fabric:'swim'});
