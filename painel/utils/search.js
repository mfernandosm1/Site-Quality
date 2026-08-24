export function normalizeSearchText(value='') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

export function searchTokens(value='') {
  return normalizeSearchText(value).split(/\s+/).filter(Boolean);
}

export function matchesSearchText(haystack='', query='') {
  const queryTokens=searchTokens(query);
  if (!queryTokens.length) return true;
  const hayTokens=searchTokens(haystack);
  if (!hayTokens.length) return false;
  return queryTokens.every(queryToken => hayTokens.some(hayToken => queryToken.length >= 3 ? hayToken.includes(queryToken) : hayToken.startsWith(queryToken)));
}


export function searchRelevanceScore({ name='', fields='', query='' }={}) {
  const normalizedQuery=normalizeSearchText(query);
  if (!normalizedQuery) return 0;
  const queryTokens=searchTokens(normalizedQuery);
  const normalizedName=normalizeSearchText(name);
  const nameTokens=searchTokens(normalizedName);
  const normalizedFields=normalizeSearchText(fields);

  let score=0;
  if (normalizedName===normalizedQuery) score+=20000;
  if (normalizedName.startsWith(`${normalizedQuery} `)||normalizedName.startsWith(normalizedQuery)) score+=15000;
  if (normalizedName.includes(normalizedQuery)) score+=12000;

  const nameMatches=queryTokens.map(token=>nameTokens.findIndex(nameToken=>nameToken.startsWith(token)));
  const allInName=nameMatches.every(index=>index>=0);
  if (allInName) {
    score+=9000;
    const ordered=nameMatches.every((value,index)=>index===0||value>=nameMatches[index-1]);
    if (ordered) score+=1500;
    const span=Math.max(...nameMatches)-Math.min(...nameMatches);
    score+=Math.max(0,800-(span*100));
    score+=queryTokens.reduce((sum,token)=>sum+(nameTokens.includes(token)?250:100),0);
  } else {
    score+=nameMatches.filter(index=>index>=0).length*1200;
  }

  if (normalizedFields===normalizedQuery) score+=3000;
  else if (normalizedFields.includes(normalizedQuery)) score+=1200;
  return score;
}
