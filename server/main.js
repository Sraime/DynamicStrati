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
          throw new Meteor.Error("invalid params","Impossible de créer une relation récursive.")
        if(US.estSynchrone(id1,id2))
          throw new Meteor.Error("incorrect","Ces USs sont déjà synchrones")
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
          throw new Meteor.Error("invalid params","Impossible de créer une relation récursive.")
        let path;
        if(US.estSynchrone(id1,id2))
          throw new Meteor.Error("incorrect","Ces USs sont synchrones")
        path = US.estAnterieure(id2,id1)
        if(path.length > 0)
          throw new Meteor.Error("incorrect",path[0].name + " est postérieure à " + path[path.length-1].name )
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
