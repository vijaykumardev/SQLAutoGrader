const  selectFromClause = /^select\s.*from/i
const selectWhereClause = /^\s*select\s.*where/i
const selectGroupByClause = /^\s*select\s.*group by/i
const selectHavingClause = /^\s*select\s.*having/i
const selectOrderByClause = /^\s*select\s.*order by/i
const selectLimitClause = /^\s*select\s.*limit/i
const selectProcedureClause = /^\s*select\s.*procedure/i
const selectIntoOutFileClause = /^\s*select\s.*into outfile/i
const selectForUpdateClause = /^\s*select\s.*for update/i

console.log(selectFromClause.exec("SELECT ((SELECT COUNT(album_id) FROM albums WHERE released IS NOT NULL) / (SELECT COUNT(DISTINCT released) FROM albums)) AS avgAlbums"))