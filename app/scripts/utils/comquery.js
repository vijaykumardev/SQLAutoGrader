function checkcombquery(query1,query2){
    var combquery = `SELECT 
  COUNT(*) 
FROM 
(
    (${query1}) a
    LEFT OUTER JOIN 
      (${query2}) B
    ON A.a = b.a and a.b = b.b and a.c = b.c
UNION 
    (${query1}) a
   RIGHT OUTER JOIN 
   (${query2}) B
    ON A.a = b.a and a.b = b.b and a.c = b.c
) 
WHERE a.a is null or b.a is null`
}