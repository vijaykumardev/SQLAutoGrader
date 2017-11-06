create or replace function compare_query_result_func(varchar,varchar) returns varchar as $$
declare
/*
* Given the user submitted query checks whether the result is exact to the given solution query
*
*
*/
submitted_query alias for $1;
solution_query alias for $2;
v_columns varchar;
v_result varchar[];
v_filter varchar:='';
v_count int:=0;
v_build_query varchar;
v_row_diff int:=0;
v_row_count int:=0;
v_score int:=0;
v_col_count int:=0;
v_row_left_diff int:=0;
v_row_right_diff int:=0;
v_projection varchar[];
v_temp varchar[];
begin
select array_to_string(regexp_matches(solution_query,'select ([.a-zA-Z_0-9 (as),]*) from','g'),',') into v_columns;
select regexp_split_to_array(v_columns, ',') into v_result;
for v_loop_var in 1..array_length(v_result,1) loop
select regexp_split_to_array(v_result[v_loop_var],'[. ]') into v_temp;
v_result[v_loop_var]:=v_temp[array_length(v_temp,1)];
end loop;
v_count:=compare_tables_func(submitted_query,v_result);
for v_loop_var in 1..array_length(v_result,1) loop
v_filter:=v_filter||' (case when A.'||v_result[v_loop_var]||E' is null then \'0\' else a.'||v_result[v_loop_var]||' end)=(case when B.'||v_result[v_loop_var]||E' is null then \'0\' else b.'||v_result[v_loop_var]||' end) and';
end loop;
v_build_query:='Select  count(a.*)-count(b.*) diff,count(a.*) FROM ( '||solution_query||' ) AS A LEFT JOIN ( '||submitted_query|| ' ) AS B ON '||trim(v_filter,' and');
execute v_build_query into v_row_left_diff,v_row_count;
v_build_query:='Select  count(a.*)-count(b.*) diff,count(a.*) FROM ( '||solution_query||' ) AS A RIGHT JOIN ( '||submitted_query|| ' ) AS B ON '||trim(v_filter,' and');
execute v_build_query into v_row_right_diff,v_row_count;
v_col_count:=length(regexp_replace('emp,table,dept,office','[^,]','','g'))+1;
--formula is retrived count/expected count
--v_score:=((v_count*v_row_count)+((v_row_left_diff+v_row_right_diff)*v_col_count))*100/(v_col_count*v_row_count);
return  v_row_right_diff||','||v_row_count;
end;
$$ language 'plpgsql' strict;

/*
Test cases for compare_query_result_func
select compare_query_result_func('select first_name,surname,born,died from people where born between 1970 and 1972 and died is not null','select first_name,surname,born,died from people where born in (1970,1972) and died is not null');
select compare_query_result_func(E'select first_name,surname,born,died from people where surname=\'Aamani\' ',E'select first_name,surname,born,died from people where surname=\'Aamani\' ');
*/


CREATE OR REPLACE FUNCTION compare_tables_func(varchar,varchar[]) RETURNS int AS $$
------------------------------
--Checks whether the query used has correct number of columns
--correct if
--
------------------------------
DECLARE
v_tables varchar;
v_query alias for $1;
v_tablenames alias for $2;
columns int:=0;
v_result int:=0;
Begin
select array_to_string(regexp_matches(v_query,'select ([a-zA-Z_0-9 ,]*) from','g'),',') into v_tables;
columns:=array_length(v_tablenames,1);
for v_count in 1..array_upper(v_tablenames,1) loop
if length(substring(v_tables::varchar from v_tablenames[v_count]::varchar)) > 0 then
columns:=columns-1;
end if;
end loop;
return columns;
end;
$$ LANGUAGE 'plpgsql' STRICT;

/*
* select compare_tables_func('select first_name,surname,born,died from people where born in (1970,1971,1972) and died is not null',ARRAY['first_name','surname','born','died']);
*/

create or replace function preprocess_query_func(varchar) returns varchar as $$
/* replaces all the * in the projection with the column names of that table */
declare
v_src_query alias for $1;
v_dest_query alias for $1;
v_tables varchar[];
v_table_alias varchar[];
v_column_list varchar:='';
v_column_temp varchar;
v_alias_check bool[];
v_table_nonalias varchar:='';
v_column_alias varchar[];
v_column_alias_elem varchar[];
v_column_from_pat varchar;
v_column_to_pat varchar;
v_replace boolean:=true;
begin
select regexp_split_to_array(array_to_string(regexp_matches(v_src_query,'from ([a-zA-Z_0-9 ,]*) where','g'),','),',') into v_tables;

--Remove table aliasing with full name
for v_count in 1..array_upper(v_tables,1) loop
if trim(v_tables[v_count]) like '% %' then
v_table_alias:=regexp_split_to_array(v_tables[v_count],' ');
v_table_nonalias:=v_table_nonalias||','||v_table_alias[1];
--replaces alias name of table with full name in rest of the query 
v_dest_query:=replace(v_dest_query,(v_table_alias[2])||'.',(v_table_alias[1])||'.');
else
v_table_nonalias:=v_table_nonalias||','||v_tables[v_count];
end if;
v_table_nonalias:=ltrim(v_table_nonalias,',');
end loop;

--replace the table_name alias_name with table_name (select * from people p where p.people_id=1 => select * form people where people_id=1)
v_dest_query:=regexp_replace(v_dest_query,'from ([a-zA-Z_0-9 ,]*) where','from '||v_table_nonalias||' where');
v_tables:=regexp_split_to_array(v_table_nonalias,',');

--Replace * in projection with the table_name.column_name
if v_src_query LIKE '%*%' and v_src_query not like 'count(*)' then
for v_count in 1..array_upper(v_tables,1) loop

select v_tables[v_count]||'.'||string_agg(column_name,','||v_tables[v_count]||'.') from information_schema.columns where table_name=v_tables[v_count] into v_column_temp;

if v_count = 1 then
v_column_list:=v_column_temp;
else
v_column_list:=v_column_list||','||v_column_temp;
end if;

end loop;
v_dest_query:=regexp_replace(v_dest_query,'[, ]{1}[\*]{1}[, ]{1}',' '||v_column_list||' ');
end if;

--Replacing any column alias name with full name in the query
select regexp_matches(array_to_string(regexp_matches(v_dest_query,'select ([()a-zA-Z_0-9 ,.]*) from'),','),'([()a-zA-Z_0-9.]+ [()a-zA-Z_0-9]+)') into v_column_alias;
if array_length(v_column_alias,1)>0 then
for v_count in 1..array_upper(v_column_alias,1) loop
v_column_alias_elem:=regexp_split_to_array(v_column_alias[v_count],' ');
	--skip if any aggregate function is present
	if v_column_alias_elem[1] like 'count(%' or v_column_alias_elem[1] like 'min(%' or v_column_alias_elem[1] like 'max(%' or v_column_alias_elem[1] like 'sum(%' or v_column_alias_elem[1] like 'avg(%' or v_column_alias_elem[1] like 'count(%' or v_column_alias_elem[1] like '(%' then
	if trim(v_column_alias_elem[array_length(v_column_alias_elem,1)]) like '%)'  then
	v_replace:=false;
	end if;
	end if;
	if v_replace  then
	--v_dest_query:=regexp_replace(v_dest_query,('[^a-zA-Z0-9]'||v_column_alias_elem[2]||'[^a-zA-Z0-9]'),' '||v_column_alias_elem[1]||' ');
	v_dest_query:=replace(v_dest_query,(' '||v_column_alias_elem[2]||' '),' '||v_column_alias_elem[1]||' ');
	--duplicate column_alias like 'count(album_id) count(album_id)' replaces with single 'count(album_id)' for below query
	--select preprocess_query_func(E'select ab.artist_id, count(album_id) c from artist_album ab where group by ab.artist_id having c >=5');
	v_dest_query:=replace(v_dest_query,v_column_alias_elem[1]||' '||v_column_alias_elem[1],v_column_alias_elem[1]);
	end if;
end loop;
end if;

return v_dest_query;
end;
$$ language 'plpgsql' strict;
/*
select preprocess_query_func(E'select * from people p,movies m where p.died is not null and p.surname=\'a\' and m.title=\'a\'');
*/

create or replace function preprocess_between_func(varchar) returns varchar as $$
/* replace all between clause with >= and <= */
declare
v_matches varchar[];
v_extract_string varchar;
v_elements varchar[];
v_query alias for $1;
begin
/* find all between clauses */
v_matches:=ARRAY(select array_to_string(regexp_matches(v_query,'([a-zA-Z_0-9]*) between ([a-zA-Z_0-9]*) and ([a-zA-Z_0-9]*)','g'),' '));
for v_loop in 1..array_length(v_matches,1) loop
v_elements:=regexp_split_to_array(v_matches[v_loop], E'\\s+');
v_query:=regexp_replace(v_query,v_elements[1]||' between '||v_elements[2]||' and '||v_elements[3],v_elements[1]||' >= '||v_elements[2]||' and '||v_elements[1]||' <= '||v_elements[3]);
end loop;
return v_query;
end;
$$ language 'plpgsql' strict;

/*
select preprocess_between_func('select first_name,surname,born,died from people where born between 1950 and 1960 and died between 1960 and 1990');
*/


create or replace function preprocess_despace_func(varchar) returns varchar as $$
/* replace all whitespace with single space */
/* place a check to not replace inside any single quotes */
begin
return regexp_replace($1,'\s+',' ','g');
end;
$$ language 'plpgsql' strict;

/*
select preprocess_despace_func(E'  select first_name,surname,\'born\'  ,died from  people   where born between 1950 and   1960');
*/

create or replace function replace_relation_precdicate_func(varchar,varchar,varchar,varchar) returns varchar as $$
/* Searches for v_pattern_search string in query and replaces every v_match_operator with v_replace_operator */
declare
v_query alias for $1;
v_pattern_search alias for $2;
v_match_operator alias for $3;
v_replace_operator alias for $4;
v_matches varchar[];
v_extract_string varchar;
v_elements varchar[];
begin
execute E'select ARRAY(select array_to_string(regexp_matches(\''||v_query||E'\',\''||v_pattern_search||E'\',\'g\'),\' \'))'
 into v_matches;
--v_matches:=ARRAY(select array_to_string(regexp_matches(v_query,v_pattern_search,'g'),' '));
if array_length(v_matches,1)>0 then
for v_loop in 1..array_length(v_matches,1) loop
v_elements:=regexp_split_to_array(v_matches[v_loop], E'\\s+');
v_query:=regexp_replace(v_query,'not '||v_elements[1]||' '||v_match_operator||' '||v_elements[2],v_elements[1]||' '||v_replace_operator||' '||v_elements[2]);
end loop;
end if;
return v_query;
end;
$$ language 'plpgsql' strict;

/*
select replace_relation_precdicate_func('select first_name,surname,born,died from people where born between 1950 and 1960 and died between 1960 and 1990 and not died > 08.00 and not born < 1950','not ([0-9.]*|[a-zA-Z_][a-zA-Z_0-9$]*) > ([0-9.]*|[a-zA-Z_][a-zA-Z_0-9$]*)','>','<=');
*/

create or replace function preprocess_not_func(varchar) returns varchar as $$
/* replace all not caluse in query */
declare
v_matches varchar[];
v_extract_string varchar;
v_elements varchar[];
v_query alias for $1;
v_pattern_search varchar;
v_match_operator varchar;
v_replace_operator varchar;
begin

/* find and replace all clauses having not > with <= */
v_pattern_search:='not ([0-9.]*|[a-zA-Z_][.a-zA-Z_0-9$]*) > ([0-9.]*|[a-zA-Z_][.a-zA-Z_0-9$]*)';
v_match_operator:='>';
v_replace_operator:='<=';
v_query:=replace_relation_precdicate_func(v_query,v_pattern_search,v_match_operator,v_replace_operator);


/* find and replace all clauses having not > with <= */
v_pattern_search:='not ([0-9.]*|[a-zA-Z_][.a-zA-Z_0-9$]*) < ([0-9.]*|[a-zA-Z_][.a-zA-Z_0-9$]*)';
v_match_operator:='<';
v_replace_operator:='>=';
v_query:=replace_relation_precdicate_func(v_query,v_pattern_search,v_match_operator,v_replace_operator);

return v_query;
end;
$$ language 'plpgsql' strict;

/*select preprocess_not_func('select first_name,surname,born,died from people where born between 1950 and 1960 and died between 1960 and 1990 and not died > 08.00 and not born < 1950');*/

create or replace function replace_int_relation_func(varchar,varchar,varchar,varchar) returns varchar as $$
/* Searches for v_pattern_search string in query and replaces every v_match_operator with v_replace_operator  for int columns */
declare
v_query alias for $1;
v_pattern_search alias for $2;
v_match_operator alias for $3;
v_replace_operator alias for $4;
v_matches varchar[];
v_extract_string varchar;
v_elements varchar[];
v_int_comparision boolean:=false;
v_modify boolean:=false;
v_table_name_1 varchar;
v_table_name_2 varchar;
v_column_name_1 varchar;
v_column_name_2 varchar;
begin
execute E'select ARRAY(select array_to_string(regexp_matches(\''||v_query||E'\',\''||v_pattern_search||E'\',\'g\'),\' \'))'
 into v_matches;
--v_matches:=ARRAY(select array_to_string(regexp_matches(v_query,v_pattern_search,'g'),' '));
if array_length(v_matches,1)>0 then
for v_loop in 1..array_length(v_matches,1) loop
v_elements:=regexp_split_to_array(v_matches[v_loop], E'\\s+');
if(position('.' in v_elements[1]) > 0 ) then
v_table_name_1:=substring(v_elements[1],0,position('.' in v_elements[1]));
v_table_name_1:=substring(v_elements[1],position('.' in v_elements[1])+1);
v_int_comparision:=true;
end if;

if(position('.' in v_elements[2]) > 0 ) then
v_table_name_2:=substring(v_elements[2],0,position('.' in v_elements[2]));
v_table_name_2:=substring(v_elements[2],position('.' in v_elements[2])+1);
v_int_comparision:=true and v_int_comparision;
end if;

if v_int_comparision then 
 select case when max(data_type)=max(data_type) and max(data_type)='integer' then true else false end into v_modify from (select data_type from information_schema.columns where (table_name = v_table_name_1 and column_name=v_column_name_1) or (table_name = v_table_name_2 and column_name=v_column_name_2)) as foo;
 /*check this why it is not working */
 if v_modify then
	v_query:=regexp_replace(v_query,v_elements[1]||' '||v_match_operator||' '||v_elements[2],v_elements[1]||' '||v_replace_operator||' '||v_elements[2]||'+1');
 end if;
 
end if;

end loop;
end if;
return v_query;
end;
$$ language 'plpgsql' strict;

create or replace function preprocess_int_rel_func(varchar) returns varchar as $$
declare
v_query alias for $1;
v_pattern_search varchar;
v_match_operator varchar;
v_replace_operator varchar;
begin

/* find and replace all clauses having not > with <= */
v_pattern_search:='([0-9.]*|[a-zA-Z_][.a-zA-Z_0-9$]*) < ([0-9.]*|[a-zA-Z_][.a-zA-Z_0-9$]*)';
v_match_operator:='<';
v_replace_operator:='<=';
v_query:=replace_int_relation_func(v_query,v_pattern_search,v_match_operator,v_replace_operator);

return v_query;
end;
$$ language 'plpgsql' strict;

/*
select preprocess_int_rel_func('select first_name,surname,born,died from people where born between 1950 and 1960 and died between 1960 and 1990 and not people.died < people.born ');
*/

create or replace function mysql_to_pgsql_func(varchar) returns varchar  as
$$
/* if mod operator (%) is present then first operand will be replaced with nullif(operand,'0')::int to convert it into integer */
declare
v_sql alias for $1;
v_mod_var varchar[];
v_pattern varchar;
v_replace varchar;
v_instr_array varchar[];
begin
v_sql:=preprocess_despace_func(v_sql);
v_sql:=preprocess_query_func(v_sql);
/* when mod is present */
for v_instr_array in select regexp_matches(v_sql,'([(a-zA-Z]{1,2}[)a-zA-Z0-9_.]+) %','g') loop
v_pattern:=v_instr_array[1]||' %';
v_replace:='nullif('||v_instr_array[1]||E',\'0\')::int %';
v_sql:=replace(v_sql,v_pattern,v_replace);
end loop;

/* when in case statement */
for v_instr_array in select regexp_matches(v_sql,'case ([(a-zA-Z]{1,2}[)a-zA-Z0-9_.]+) when ([-]{0,1}[0-9.]+){1}','g') loop
v_pattern:='case '||v_instr_array[1]||' when';
v_replace:='case nullif('||v_instr_array[1]||E',\'0\')::int when';
v_sql:=replace(v_sql,v_pattern,v_replace);
end loop;

/* when in between statement */
for v_instr_array in select regexp_matches(v_sql,'([(a-zA-Z]{1,2}[)a-zA-Z0-9_.]+) between ([-]{0,1}[0-9.]+){1}','g') loop
v_pattern:=v_instr_array[1]||' between';
v_replace:='nullif('||v_instr_array[1]||E',\'0\')::int between';
v_sql:=replace(v_sql,v_pattern,v_replace);
end loop;

/* when filter is present */
for v_instr_array in select regexp_matches(v_sql,'([a-zA-Z]{1}[a-zA-Z0-9.]*){1} ([=><!]{1,2}) ([-]{0,1}[0-9.]*){1}','g') loop
v_pattern:=v_instr_array[1]||' '||v_instr_array[2]||' '||v_instr_array[3];
v_replace:='nullif('||v_instr_array[1]||E',\'0\')::int '||v_instr_array[2]||' '||v_instr_array[3];
v_sql:=replace(v_sql,v_pattern,v_replace);
end loop;

/* when having is present by not group by statement */
/* Check if it contains having clause without group by clause and then add group by clause with the columns from projection */
return  v_sql;
end;
$$ language 'plpgsql' strict;

/* select mysql_to_pgsql_func(E'select title, case (released) when 1997 then \'Before\' when 1998 then \'Exact\' when 1999 then \'After\' end from albums where released % 4 =  0 and year = 1997 and released = 5'); */
