import {Neo4j, Stringifier} from '../drivers/neo4j'

const LABEL = "US";
const REL_EST_SYNCHRONE = "EST_SYNCHRONE";
const REL_EST_ANTERIEURE = "EST_ANTERIEURE";


export let US = {

  relationnalFindAll(){
    let query = "MATCH (n:US) "+
                "OPTIONAL MATCH (n)<--(b:Bag)-->(s:US) "+
                "OPTIONAL MATCH (n)<-[:EST_ANTERIEURE]-(a:US) "+
                "OPTIONAL MATCH (n)-[:EST_ANTERIEURE]->(p:US) "+
                "WITH n, " +
                "collect(DISTINCT{_id: id(s), name: s.name}) as syncs, " +
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
                "WHERE id(bb) = id(b) AND NOT (bb)-->(:"+LABEL+") " +
                "DETACH DELETE bb";
    console.log(query)
    Neo4j.query(query)
  },

  addUsSynchro(id1,id2) {

    let query = "MATCH (u1:"+LABEL+")<--(b1:Bag)," +
                        "(u2:"+LABEL+")<--(b2:Bag) " +
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2 +" " +
                "WITH b1, b2 " +
                "OPTIONAL MATCH (b1)-->(uss1:"+LABEL+") "+
                "WITH b1, collect(uss1) as luss1, b2 " +
                "FOREACH (us in luss1| MERGE (b2)-[:INCLUDE]->(us)) " +
                "DETACH DELETE b1 " +
                "WITH b2 as nb " +
                "OPTIONAL MATCH (nb)-->(usto:US)<-[:EST_ANTERIEURE]-(usfrom:US)<--(bfrom:Bag) " +
                "WITH nb, bfrom, collect({ut: usto, uf: usfrom}) as cus " +
                "WITH nb, bfrom, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)<-[:EST_ANTERIEURE {from: r.uf.name, to: r.ut.name}]-(bfrom) ) " +
                "WITH nb " +
                "OPTIONAL MATCH (nb)-->(usfrom:US)-[:EST_ANTERIEURE]->(usto:US)<--(bto:Bag) " +
                "WITH nb, bto, collect({uf: usfrom, ut: usto}) as cus " +
                "WITH nb, bto, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)-[:EST_ANTERIEURE {from: r.uf.name, to: r.ut.name}]->(bto) ) " ;

    console.log(query)
    Neo4j.query(query)
  },

  exitSynchro(id1) {

    let query = "MATCH (u:"+LABEL+")-[r]-(b:Bag) " +
                "WHERE id(u) = " +id1+" " +
                "WITH u, r, b " +
                "OPTIONAL MATCH (b)<-[ant:EST_ANTERIEURE {to: u.name}]-() " +
                "OPTIONAL MATCH (b)-[post:EST_ANTERIEURE {from: u.name}]->() " +
                "DELETE r, ant, post " +
                "CREATE (u)<-[:INCLUDE]-(nb:Bag) " +
                "WITH nb " +
                "OPTIONAL MATCH (nb)-->(usto:US)<-[:EST_ANTERIEURE]-(usfrom:US)<--(bfrom:Bag) " +
                "WITH nb, bfrom, collect({ut: usto, uf: usfrom}) as cus " +
                "WITH nb, bfrom, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)<-[:EST_ANTERIEURE {from: r.uf.name, to: r.ut.name}]-(bfrom) ) " +
                "WITH nb " +
                "OPTIONAL MATCH (nb)-->(usfrom:US)-[:EST_ANTERIEURE]->(usto:US)<--(bto:Bag) " +
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
    let query = "MATCH (u1:"+LABEL+")<--(b1:Bag), (u2:"+LABEL+")<--(b2:Bag), " +
                  "path = shortestPath((b1)-[:"+REL_EST_ANTERIEURE+"*"+(bagDepth ? ".."+bagDepth : "")+"]->(b2)) "+
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+" " +
                "RETURN u1+relationships(path)+u2";
    console.log(query);
    return Neo4j.query(query);
  },

  estSynchrone(id1, id2) {
    let query = "MATCH path = (u1:"+LABEL+")<--(:Bag)-->(u2:"+LABEL+") "+
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+" " +
                "RETURN path";
    console.log(query);
    return Neo4j.query(query);
  }
}