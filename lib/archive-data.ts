import { characterEntries, characterProfileVersion } from './character-profiles';
export type Lang = 'zh' | 'ja' | 'en';
export const langs: Lang[] = ['zh','ja','en'];
export const categories = ['characters','illustrations','comics','novels','extras'] as const;
export type Category = typeof categories[number];
export type Translation = {title:string; subtitle:string; body:string; images?:string[]};
export type Entry = {id:string; category:Category; code:string; date:string; images:string[]; translations:Record<Lang,Translation>};
export type Settings = Record<Lang,{headline:string; intro:string; synopsisTitle:string; synopsis:string}>;
export type ArchiveData = {entries:Entry[]; settings:Settings; characterProfileVersion?:number};
export const blankTranslation = ():Translation=>({title:'',subtitle:'',body:''});
export const seed:ArchiveData = {
settings:{
zh:{headline:'王室機密\n關係檔案',intro:'兩位王子。一份機密紀錄。\n以及，未被寫進歷史的六個月。',synopsisTitle:'歷史之外，\n還有未公開的紀錄。',synopsis:'王位、權力，以及無法被簡化的關係。\n\n這裡保存關於班傑明與切利多尼希的二次創作：人物檔案、插圖、漫畫，以及那些未被記錄的故事。\n\n選擇一份檔案，從你感興趣的地方開始閱讀。各篇作品的世界線與設定，以作品內的說明為準。'},
ja:{headline:'王室機密\n関係記録',intro:'二人の王子。一つの機密記録。\nそして、歴史に記されなかった六か月。',synopsisTitle:'歴史の外に、\n未公開の記録がある。',synopsis:'王位、権力、そして一言では語れない関係。\n\nベンジャミンとツェリードニヒを描く非公式ファン作品のアーカイブ。人物資料、イラスト、漫画、小説を収録します。\n\n気になる記録から読み始めてください。世界観や設定は、各作品の説明をご確認ください。'},
en:{headline:'Royal secrets.\nPrivate records.',intro:'Two princes. One classified record.\nAnd six months left out of history.',synopsisTitle:'Beyond history,\na private record.',synopsis:'The throne. Power. A relationship that defies a simple account.\n\nAn unofficial fan archive of Benjamin and Tserriednich: character files, illustrations, comics, and stories outside the official record.\n\nOpen any file that catches your attention. Each work specifies its own continuity and setting.'}},
characterProfileVersion,
entries:characterEntries
};
