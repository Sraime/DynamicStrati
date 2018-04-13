import { Meteor } from 'meteor/meteor';
import { AnyDb } from 'meteor/ccorcos:any-db'
import { US } from '../imports/api/US'

Meteor.startup(() => {

  Meteor.methods(
    {
      'US.create'({name}){
        US.create(name);
        AnyDb.refresh('UScreate',(refreshData) => {
          return refreshData;
        })
      },
      'US.delete'({id}){
        US.delete(id);
        AnyDb.refresh('UScreate',(refreshData) => {
          return refreshData;
        })
      },
      'US.update.synchro.add'({id1, id2}) {
        if(id1 === id2)
          throw new Meteor.Error("invalid params","ERREUR : Impossible de créer une relation récursive.");
        let path = US.estSynchrone(id1,id2);
        if(path.length > 0){
          let strPath = "";
          for(var i = 0; i < path.length; i++)
            strPath += path[i].name ? "("+path[i].name+")" : "-[synchrone]-";
          throw new Meteor.Error("incorrect","ERREUR : Ces US sont synchrones => "+strPath);
        }
        path = US.estAnterieure(id2,id1);
        path = path.length > 0 ? path : US.estAnterieure(id1,id2);
        if(path.length > 0){
          let strPath = "";
          let lastUsName = "";
          for(var i = 0; i < path.length; i++){
            if(i === 0)
              strPath = "("+path[i].name+")";
            else if(i === path.length-1 && lastUsName !== path[i].name)
              strPath += "-[synchrone]-("+path[i].name+")";
            else if(path[i].from) {
              strPath += path[i].from == lastUsName ? "" : "-[synchrone]-("+path[i].from+")";
              strPath += "-[anterieure]->("+path[i].to+")";
            }
            lastUsName = path[i].name ? path[i].name : path[i].to ? path[i].to : lastUsName;
          }
          throw new Meteor.Error("incorrect","ERREUR : "+path[0].name + " est antérieure à " + path[path.length-1].name+" => "+strPath )
        }
        US.addUsSynchro(id1,id2);
        AnyDb.refresh('UScreate', (refreshData) => {
          return refreshData;
        })
      },
      'US.update.synchro.delete'({id1, id2}) {
        US.deleteUsSynchro(id1,id2);
        AnyDb.refresh('UScreate', (refreshData) => {
          return refreshData;
        })
      },
      'US.update.ant.add'({id1, id2}) {
        if(id1 === id2)
          throw new Meteor.Error("invalid params","ERREUR : Impossible de créer une relation récursive.")
        let path = US.estSynchrone(id1,id2);
        if(path.length > 0){
          let strPath = "";
          for(var i = 0; i < path.length; i++)
            strPath += path[i].name ? "("+path[i].name+")" : "-[synchrone]-";
          throw new Meteor.Error("incorrect","ERREUR : Ces US sont synchrones => "+strPath)
        }
        path = US.estAnterieure(id2,id1)
        if(path.length > 0){
          let strPath = "";
          let lastUsName = "";
          for(var i = 0; i < path.length; i++){
            if(i === 0)
              strPath = "("+path[i].name+")";
            else if(i === path.length-1 && lastUsName !== path[i].name)
              strPath += "-[synchrone]-("+path[i].name+")";
            else if(path[i].from) {
              strPath += path[i].from == lastUsName ? "" : "-[synchrone]-("+path[i].from+")";
              strPath += "-[anterieure]->("+path[i].to+")";
            }
            lastUsName = path[i].name ? path[i].name : path[i].to ? path[i].to : lastUsName;
          }
          throw new Meteor.Error("incorrect","ERREUR : "+path[0].name + " est antérieure à " + path[path.length-1].name+" => "+strPath )
        }

        US.addUsAnt(id1,id2,US.estAnterieure(id1,id2,1));
        AnyDb.refresh('UScreate', (refreshData) => {
          return refreshData;
        })
      },
      'US.update.ant.delete'({id1, id2}) {
        US.deleteUsAnt(id1,id2);
        AnyDb.refresh('UScreate', (refreshData) => {
          return refreshData;
        })
      }
    }
  )

  AnyDb.publish('UScreate', (query) => {
    return US.relationnalFindAll();
  })
});
