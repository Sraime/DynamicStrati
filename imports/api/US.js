import {Neo4j, Stringifier} from '../drivers/neo4j'

const LABEL = "US";
const REL_EST_SYNCHRONE = "EST_SYNCHRONE";
const REL_EST_ANTERIEURE = "EST_ANTERIEURE";


export let US = {

  relationnalFindAll(){
    let query = "MATCH (n:US) "+
                "OPTIONAL MATCH (n)-[:EST_SYNCHRONE]-(s:US) "+
                "OPTIONAL MATCH (n)<-[:EST_ANTERIEURE]-(a:US) "+
                "OPTIONAL MATCH (n)-[:EST_ANTERIEURE]->(p:US) "+
                "WITH n," +
                " collect(DISTINCT{_id: id(s), name: s.name}) as syncs, " +
                "collect(DISTINCT{_id: id(a), name: a.name}) as ants, " +
                "collect(DISTINCT{_id: id(p), name: p.name}) as posts "+
                "RETURN {_id: id(n), name: n.name, syncs: syncs, ants: ants, posts: posts} ORDER BY n.name"
    console.log(query)
    return Neo4j.query(query);
  },

  create(name) {
    let query = "CREATE (u:"+LABEL+" {name:"+Stringifier(name)+"})<-[:INCLUDE]-(b:Bag) " +
                "RETURN {_id: id(u),name: u.name}";
    console.log(query)
    return Neo4j.query(query)
  },

  delete(id) {
    let query = "MATCH (u:"+LABEL+")<--(b:Bag) " +
                "WHERE id(u) = "+id+" " +
                "OPTIONAL MATCH (b)-[r:EST_ANTERIEURE]-(:Bag) " +
                "WHERE r.from = u.name OR r.to = u.name " +
                "DETACH DELETE u,r " +
                "WITH b "+
                "MATCH (bb:Bag) " +
                "WHERE id(bb) = id(b) AND NOT (bb)-->(:US) " +
                "DETACH DELETE bb";
    console.log(query)
    Neo4j.query(query)
  },

  addUsSynchro(id1,id2) {

    let query = "MATCH (u1:"+LABEL+")<--(b1),(u2:"+LABEL+")<--(b2:Bag) " +
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+ " " +
                "MERGE (u1)-[:"+REL_EST_SYNCHRONE+"]->(u2) " +
                "DETACH DELETE b1, b2 " +
                "WITH u1 " +
                "MATCH (u1)-[:EST_SYNCHRONE*]-(ou:US) " +
                "WITH collect(ou) + u1 as lincs " +
                "CREATE (b:Bag) " +
                "FOREACH (us in lincs | MERGE (b)-[:INCLUDE]->(us)) " +
                "WITH b as nb " +
                "OPTIONAL MATCH (nb)-->(usto:US)-[:EST_ANTERIEURE]->(usfrom:US)<--(bfrom:Bag) " +
                "WITH nb, bfrom, collect({ut: usto, uf: usfrom}) as cus " +
                "WITH nb, bfrom, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)<-[:EST_ANTERIEURE {from: r.uf.name, to: r.ut.name}]-(bfrom) ) " +
                "WITH nb " +
                "OPTIONAL MATCH (nb)-->(usfrom:US)<-[:EST_ANTERIEURE]-(usto:US)<--(bto:Bag) " +
                "WITH nb, bto, collect({uf: usfrom, ut: usto}) as cus " +
                "WITH nb, bto, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)-[:EST_ANTERIEURE {from: r.uf.name, to: r.ut.name}]->(bto) ) " ;

    console.log(query)
    Neo4j.query(query)
  },

  deleteUsSynchro(id1,id2) {
    let query = "MATCH (u1:"+LABEL+")-[r:"+REL_EST_SYNCHRONE+"]-(u2:"+LABEL+")<-[rb2]-(b:Bag) " +
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+" " +
                "DELETE r " +
                "WITH u2,b,rb2 " +
                "OPTIONAL MATCH (u2)-[:EST_SYNCHRONE*]-(ou:US)<-[rb]-(b) " +
                "OPTIONAL MATCH (b)-[ob:EST_ANTERIEURE]-(:Bag) " +
                "WHERE ob.from = u2.name OR ob.from = ou.name OR ob.to = u2.name OR ob.to = ou.name " +
                "WITH b as bag,collect(ou)+u2 as old_incs ,collect(rb)+rb2 as old_rel_incs, collect(ob) as rel_bags " +
                "FOREACH (rel in old_rel_incs | DELETE rel ) " +
                "FOREACH (rel in rel_bags | DELETE rel) " +
                "CREATE (nb:Bag) " +
                "FOREACH (us in old_incs | MERGE (nb)-[:INCLUDE]->(us)) " +
                "WITH nb " +
                "OPTIONAL MATCH (nb)-->(usto:US)-[:EST_ANTERIEURE]->(usfrom:US)<--(bfrom:Bag) " +
                "WITH nb, bfrom, collect({ut: usto, uf: usfrom}) as cus " +
                "WITH nb, bfrom, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)<-[:EST_ANTERIEURE {from: r.uf.name, to: r.ut.name}]-(bfrom) ) " +
                "WITH nb " +
                "OPTIONAL MATCH (nb)-->(usfrom:US)<-[:EST_ANTERIEURE]-(usto:US)<--(bto:Bag) " +
                "WITH nb, bto, collect({uf: usfrom, ut: usto}) as cus " +
                "WITH nb, bto, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)-[:EST_ANTERIEURE {from: r.uf.name, to: r.ut.name}]->(bto) ) " ;
    console.log(query)
    Neo4j.query(query)
  },

  addUsAnt(id1,id2, bagLink = true) {
    let query = "MATCH (u1:"+LABEL+")<--(b1:Bag),(u2:"+LABEL+")<--(b2:Bag) " +
      "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+ " " +
      "MERGE (u1)-[:"+REL_EST_ANTERIEURE+"]->(u2) " +
      "MERGE (b1)-[:"+REL_EST_ANTERIEURE+" {from: u1.name, to: u2.name}]->(b2) ";
    console.log(query)
    Neo4j.query(query)
  },

  deleteUsAnt(id1,id2) {
    let query = "MATCH (u1:"+LABEL+")-[r:"+REL_EST_ANTERIEURE+"]->(u2:"+LABEL+")<--(:Bag)<-[br:"+REL_EST_ANTERIEURE+" {from: u1.name, to: u2.name}]-(:Bag)" +
      "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+" DELETE r,br";
    Neo4j.query(query)
  },

  estAnterieure(id1, id2, bagDepth = null) {
    let query = "MATCH path = (u1:"+LABEL+")<--(b1:Bag)-[:"+REL_EST_ANTERIEURE+"*"+(bagDepth ? ".."+bagDepth : "")+"]-(b2:Bag)-->(u2:"+LABEL+") "+
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+" " +
                "RETURN path";
    console.log(query);
    return Neo4j.query(query);
  },

  estSynchrone(id1, id2) {
    let query = "MATCH path = (u1:"+LABEL+")-[:"+REL_EST_SYNCHRONE+"*]-(u1:"+LABEL+") "+
      "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+" " +
      "RETURN path";
    console.log(query);
    return Neo4j.query(query).length > 0;
  }
}