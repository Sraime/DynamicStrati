import {Neo4jDb} from './meteor-neo4j/coffeeneo4j'

const Neo4j = new Neo4jDb("http://neo4j:neo@localhost:7474");
const Stringifier = Neo4j.stringify;
const Regexifier = Neo4j.regexify;

export {Neo4j, Stringifier, Regexifier}
