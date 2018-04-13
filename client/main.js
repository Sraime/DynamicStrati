import React from 'react';
import ReactDOM from 'react-dom';
import {Meteor} from 'meteor/meteor';
import { AnyDb } from 'meteor/ccorcos:any-db'

let subUs = AnyDb.subscribe('UScreate', [], (sub) => {
  refreshUsList(sub.data);
  sub.onChange( (data) => {
      refreshUsList(data);
    })
  }
)

const refreshUsList = (data) => {
  let jsx = renderUs(data);
  ReactDOM.render(jsx, document.getElementById('list-us'));
  let dataSelect = data.map((us) => { return {id: us._id, text: us.name}});
  console.log("refresh list with : ", dataSelect)
  $(".select2-us").html(null).select2(
    {data: dataSelect, width: 200}
  );
}

const renderUsAsListItem = (uss) => {
  return uss.filter((us) => us._id != null).map( (us) => {
    return <li key={us._id}>{us.name}</li>
  })
}
const renderUs= (uslist) => {

  return uslist.map((us) => {
    let synchsJSX = renderUsAsListItem(us.syncs);
    let antsJSX = renderUsAsListItem(us.ants);
    let postsJSX = renderUsAsListItem(us.posts);

    return (
      <div className=" col-md-12 col-lg-6" >
        <div key={us._id} className="card">
          <div className="card-header">
            <h4>{us.name}</h4>
          </div>
          <div className="card-body">

            {synchsJSX.length > 0 ? (
              <div className="us-relations us-relations-syncs">
                <h5>US(s) Synchrone(s)</h5>
                <ul>
                  {synchsJSX}
                </ul>
              </div>
            ):null}

            {antsJSX.length > 0 ? (
              <div className="us-relations us-relations-ants">
                <h5>US(s) Antérieure(s)</h5>
                <ul>
                  {antsJSX}
                </ul>
              </div>
            ):null}

            {postsJSX.length > 0 ? (
              <div className="us-relations us-relations-posts">
                <h5>US(s) Postérieure(s)</h5>
                <ul>
                  {postsJSX}
                </ul>
              </div>
            ):null}

            <button className="btn-danger"
                    onClick={ () => {
                        Meteor.call('US.delete', {id: us._id})
                    }}>Delete</button>
          </div>
        </div>
      </div>
    );
  });
};

const handleSubmit = (e) => {
  let usName = e.target.usName.value;

  e.preventDefault();

  if (usName) {
    e.target.usName.value = '';
    let payload = {name: usName}
    Meteor.call('US.create', payload)
  }
};

const handleSubmitRel = (e) => {
  let id1 = e.target.relus1.value;
  let id2 = e.target.relus2.value;
  e.preventDefault();

  if(id1 && id2) {
    let payload = {id1: id1, id2: id2}
    let remoteAction = 'US.update.'+e.target.reltype.value+"."+e.target.relaction.value;
    Meteor.call(remoteAction, payload, (err,res) => {
      let flashMessage = <div className={err ? "alert alert-danger" : "alert alert-success"} role="alert">{err ? err.reason : "Success"}</div>
      ReactDOM.render(flashMessage, document.getElementById('form-rel-flash'));
    })
  }

};

Meteor.startup(() => {
  let jsx = (
    <div>
      <h4>Création : </h4>
      <form onSubmit={handleSubmit} className="form-row">
        <div class="form-group col-md-3">
          <input type="text" name="usName" class="form-control" placeholder="Us Name"/>
        </div>
        <div class="form-group col-md-3">
          <button className="btn" >Add Player</button>
        </div>
      </form>
    </div>
  );
  ReactDOM.render(jsx, document.getElementById('form-us'));

  jsx = (
    <div>
      <form onSubmit={handleSubmitRel}>
        <h4>Relation : </h4>
        <div className="row">
          <div className="col">
            <select name="relaction">
              <option value="add">créer</option>
              <option value="delete">supprimer</option>
            </select>
          </div>
          <div className="col">
            <select className="select2 select2-us" id="select2-us1" name="relus1"></select>
          </div>
          <div className="col">
            <select name="reltype">
              <option value="synchro">synchrone à</option>
              <option value="ant">antérieure à</option>
            </select>
          </div>
          <div className="col">
            <select className="select2 select2-us" id="select2-us2" name="relus2"></select>
          </div>
          <div className="col">
            <button className="btn">Excuter</button>
          </div>
        </div>
      </form>
    </div>
  );
  ReactDOM.render(jsx, document.getElementById('form-rel-us'));
  $(".select2").select2({width: 200});
});