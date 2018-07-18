import {Neo4j, Stringifier} from '../drivers/neo4j'

// Unité Stratigraphique
const US_LABEL = "UniteStrati";


// lien d'antériorité entre deux US
const REL_EST_ANTERIEURE = "EST_ANTERIEURE";

// Un Bag est la représentation d'un ensemble synchrones
// Les US liées d'inclusion à un Bag sont synchrones entre elles.
const BAG_LABEL = "Bag";

// lien d'inclusion entre un Bag et une US
const REL_INCLUDE = "INCLUDE";


export let US = {

  /**
   * Répère tous les relations explicité et implicite (synchrones, antérieures, postérieures) de degré 1 de chaque US
   */
  relationnalFindAll(){
    let query = "MATCH (n:"+US_LABEL+") "+
                "OPTIONAL MATCH (n)<--(b:"+BAG_LABEL+")-->(s:"+US_LABEL+") "+
                "OPTIONAL MATCH (n)<-[:"+REL_EST_ANTERIEURE+"]-(a:"+US_LABEL+") "+
                "OPTIONAL MATCH (n)-[:"+REL_EST_ANTERIEURE+"]->(p:"+US_LABEL+") "+
                "WITH n, " +
                "collect(DISTINCT{_id: id(s), name: s.name}) as syncs, " +
                "collect(DISTINCT{_id: id(a), name: a.name}) as ants, " +
                "collect(DISTINCT{_id: id(p), name: p.name}) as posts "+
                "RETURN {_id: id(n), name: n.name, syncs: syncs, ants: ants, posts: posts} ORDER BY n.name"
    console.log(query)
    return Neo4j.query(query);
  },

  /**
   * Création d'une US et de son Bag
   * @param name : nom de l'US
   */
  create(name) {
    let query = "CREATE (u:"+US_LABEL+" {name:"+Stringifier(name)+"})<-[:"+REL_INCLUDE+"]-(b:"+BAG_LABEL+") " +
                "RETURN {_id: id(u),name: u.name}";
    console.log(query)
    return Neo4j.query(query)
  },

  /**
   * Suppression d'une US
   * Si l'US a généré des relations entre les Bags, elles sont aussi supprimées
   * Si le Bag est orphelin, il est supprimé
   * @param id : identifiant de l'US à supprimer
   */
  delete(id) {
    let query = "MATCH (u:"+US_LABEL+")<--(b:"+BAG_LABEL+") " +
                "WHERE id(u) = "+id+" " +
                "OPTIONAL MATCH (b)-[r:"+REL_EST_ANTERIEURE+"]-(:"+BAG_LABEL+") " +
                "WHERE r.from = u.name OR r.to = u.name " +
                "DETACH DELETE u,r " +
                "WITH b "+
                "MATCH (bb:"+BAG_LABEL+") " +
                "WHERE id(bb) = id(b) AND NOT (bb)-->(:"+US_LABEL+") " +
                "DETACH DELETE bb";
    console.log(query)
    Neo4j.query(query)
  },

  /**
   * Ajout d'une US à un ensemble synchrone
   * Si l'US est déjà s'ynchrone à d'autres US, ces US sont aussi ajoutées
   * Le Bag de l'US est supprimé
   * @param id1 : US à ajouter
   * @param id2 : Une US de l'ensemble synchrone cible
   */
  addUsSynchro(id1,id2) {

    let query = "MATCH (u1:"+US_LABEL+")<--(b1:"+BAG_LABEL+")," +
                        "(u2:"+US_LABEL+")<--(b2:"+BAG_LABEL+") " +
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2 +" " +
                "WITH b1, b2 " +
                "OPTIONAL MATCH (b1)-->(uss1:"+US_LABEL+") "+
                "WITH b1, collect(uss1) as luss1, b2 " +
                "FOREACH (us in luss1| MERGE (b2)-[:"+REL_INCLUDE+"]->(us)) " +
                "DETACH DELETE b1 " +
                "WITH b2 as nb " +
                "OPTIONAL MATCH (nb)-->(usto:"+US_LABEL+")<-[:"+REL_EST_ANTERIEURE+"]-(usfrom:"+US_LABEL+")<--(bfrom:"+BAG_LABEL+") " +
                "WITH nb, bfrom, collect({ut: usto, uf: usfrom}) as cus " +
                "WITH nb, bfrom, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)<-[:"+REL_EST_ANTERIEURE+" {from: r.uf.name, to: r.ut.name}]-(bfrom) ) " +
                "WITH nb " +
                "OPTIONAL MATCH (nb)-->(usfrom:"+US_LABEL+")-[:"+REL_EST_ANTERIEURE+"]->(usto:"+US_LABEL+")<--(bto:"+BAG_LABEL+") " +
                "WITH nb, bto, collect({uf: usfrom, ut: usto}) as cus " +
                "WITH nb, bto, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)-[:"+REL_EST_ANTERIEURE+" {from: r.uf.name, to: r.ut.name}]->(bto) ) " ;

    console.log(query)
    Neo4j.query(query)
  },

  /**
   * Sortie d'une US de son ensemble synchrone
   * Un nouveau est créé et lui est associé
   * @param id1 : Us à sortie
   */
  exitSynchro(id1) {

    let query = "MATCH (u:"+US_LABEL+")-[r]-(b:"+BAG_LABEL+") " +
                "WHERE id(u) = " +id1+" " +
                "WITH u, r, b " +
                "OPTIONAL MATCH (b)<-[ant:"+REL_EST_ANTERIEURE+" {to: u.name}]-() " +
                "OPTIONAL MATCH (b)-[post:"+REL_EST_ANTERIEURE+" {from: u.name}]->() " +
                "DELETE r, ant, post " +
                "CREATE (u)<-[:"+REL_INCLUDE+"]-(nb:"+BAG_LABEL+") " +
                "WITH nb " +
                "OPTIONAL MATCH (nb)-->(usto:"+US_LABEL+")<-[:"+REL_EST_ANTERIEURE+"]-(usfrom:"+US_LABEL+")<--(bfrom:"+BAG_LABEL+") " +
                "WITH nb, bfrom, collect({ut: usto, uf: usfrom}) as cus " +
                "WITH nb, bfrom, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)<-[:"+REL_EST_ANTERIEURE+" {from: r.uf.name, to: r.ut.name}]-(bfrom) ) " +
                "WITH nb " +
                "OPTIONAL MATCH (nb)-->(usfrom:"+US_LABEL+")-[:"+REL_EST_ANTERIEURE+"]->(usto:"+US_LABEL+")<--(bto:"+BAG_LABEL+") " +
                "WITH nb, bto, collect({uf: usfrom, ut: usto}) as cus " +
                "WITH nb, bto, filter(x IN cus WHERE x.ut IS NOT NULL) as nrel " +
                "FOREACH (r IN nrel | MERGE (nb)-[:"+REL_EST_ANTERIEURE+" {from: r.uf.name, to: r.ut.name}]->(bto) ) " ;

    console.log(query)
    Neo4j.query(query)
  },

  /**
   * Ajout d'un synchronisme entre deux US
   * La relation est répliquée entre les Bags avec en attributs, l'US source (from) et l'US cible (to)
   * @param id1 : US source
   * @param id2 : US cible
   */
  addUsAnt(id1,id2) {
    let query = "MATCH (u1:"+US_LABEL+")<--(b1:"+BAG_LABEL+"),(u2:"+US_LABEL+")<--(b2:"+BAG_LABEL+") " +
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+ " " +
                "MERGE (u1)-[:"+REL_EST_ANTERIEURE+"]->(u2) " +
                "MERGE (b1)-[:"+REL_EST_ANTERIEURE+" {from: u1.name, to: u2.name}]->(b2) ";
    console.log(query)
    Neo4j.query(query)
  },

  /**
   * Suppression d'une relation d'antériorité
   * La relation entre les Bags est aussi supprimée
   * @param id1 : US source
   * @param id2 : US cible
   */
  deleteUsAnt(id1,id2) {
    let query = "MATCH (u1:"+US_LABEL+")-[r:"+REL_EST_ANTERIEURE+"]->(u2:"+US_LABEL+")<--(:"+BAG_LABEL+")<-[br:"+REL_EST_ANTERIEURE+" {from: u1.name, to: u2.name}]-(:"+BAG_LABEL+")" +
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+" DELETE r,br";
    Neo4j.query(query)
  },

  /**
   * Vérification de l'antériorité d'une US par rapport à une autre
   * @param id1 : US source
   * @param id2 : US cible
   * @param bagDepth : Profondeur de la vérificaton (infinie par défaut)
   */
  estAnterieure(id1, id2, bagDepth = null) {
    let query = "MATCH (u1:"+US_LABEL+")<--(b1:"+BAG_LABEL+"), (u2:"+US_LABEL+")<--(b2:"+BAG_LABEL+"), " +
                  "path = shortestPath((b1)-[:"+REL_EST_ANTERIEURE+"*"+(bagDepth ? ".."+bagDepth : "")+"]->(b2)) "+
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+" " +
                "RETURN u1+relationships(path)+u2";
    console.log(query);
    return Neo4j.query(query);
  },

  /**
   * Vérification du synchronisme entre deux US
   * @param id1 : première US
   * @param id2 : deuxième US
   */
  estSynchrone(id1, id2) {
    let query = "MATCH path = (u1:"+US_LABEL+")<--(:"+BAG_LABEL+")-->(u2:"+US_LABEL+") "+
                "WHERE id(u1) = "+id1+" AND id(u2) = "+id2+" " +
                "RETURN path";
    console.log(query);
    return Neo4j.query(query);
  }
}