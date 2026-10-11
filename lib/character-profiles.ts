import type { ArchiveData, Entry, Lang } from './archive-data';
import profiles from './character-profiles.json';

export const characterProfileVersion = 2;
export const characterEntries: Entry[] = profiles as Entry[];

// Update supplied profiles once, preserving uploaded images and all other records.
export function applyCharacterProfiles(data: ArchiveData): ArchiveData {
 if((data.characterProfileVersion??0)>=characterProfileVersion)return data;
 const remaining=new Map(characterEntries.map(entry=>[entry.id,entry]));
 const entries=data.entries.map(entry=>{
  const replacement=remaining.get(entry.id);
  if(!replacement)return entry;
  remaining.delete(entry.id);
  return {...replacement, images:entry.images, translations:Object.fromEntries((['zh','ja','en'] as Lang[]).map(lang=>[lang,{
   ...replacement.translations[lang], ...(entry.translations[lang].images?{images:entry.translations[lang].images}:{}),
  }])) as Entry['translations']};
 });
 return {...data,entries:[...entries,...remaining.values()],characterProfileVersion};
}
