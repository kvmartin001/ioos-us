"use strict"
var express = require('express');
var router = express.Router();
var pgp = require('pg-promise')();
var pq = require('pg-promise').ParameterizedQuery;

const connectionstring = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
var db;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'The U.S. Integrated Ocean Observing System (IOOS)' });
});

/* GET region map page. */
router.get('/regions', function(req, res, next) {
  res.render('regions', { title: 'The U.S. Integrated Ocean Observing System (IOOS) | Regions Map' });
});

/* GET contact us page. */
router.get('/contact-us', function(req, res, next) {
  res.render('contact-us', { title: 'The U.S. Integrated Ocean Observing System (IOOS) | Contact Us' });
});

/* GET comt about page. */
router.get('/comt', function(req, res, next) {
  var findProjects = new pq('SELECT title, SUBSTRING (overview, 0, 280) as overview, title_key FROM projects ORDER BY id ASC');
  if (db === undefined)
    db = pgp(connectionstring);
  db.many(findProjects)
  .then(function (data) {
    res.render('comt/index', {
      title: 'The U.S. Integrated Ocean Observing System (IOOS) | Coastal and Ocean Modeling Testbed Projects',
      projects: data });
  })
  .catch(function (error) {
    console.log('ERROR:', error);
  });
});

/* GET comt projects page. */
router.get('/comt/projects/:title_key', function(req, res, next) {
  var allDatasets = require('../public/comt_datasets');
  var projectDatasets = [];
  var findProjectTitles = new pq('SELECT title, title_key FROM projects ORDER BY id ASC');
  var findProject = new pq('SELECT id, title, team as "Project Team", overview as "Project Overview and Results", ' +
              'model_desc as "Model Descriptions", sub_project_desc as "Sub-Project Descriptions/Data", ' +
              'pubs as "Publications", title_key FROM projects WHERE title_key = $1', req.params.title_key);
  if (db === undefined)
    db = pgp(connectionstring);
  db.task(function(t){
    return t.batch([
      t.many(findProjectTitles),
      t.one(findProject)
    ]);
  })
  .then(function (data) {
    allDatasets.dataset.forEach(function (dataset) {
      if (dataset.comt.project === req.params.title_key)
        projectDatasets.push(dataset);
    });
    res.render('comt/project', {
      title: 'The U.S. Integrated Ocean Observing System (IOOS) | Coastal and Ocean Modeling Testbed Projects | ' + data[1].title,
      data: data,
      title_key: req.params.title_key,
      datasets: projectDatasets,
      path: req.path
    });
  })
  .catch(function (error) {
    console.log('ERROR:', error);
  });
});

/* GET comt dataset page. */
router.get('/comt/projects/:title_key/:dataset', function(req, res, next) {
  var datasetTitle = req.params.dataset,
      datasets = require('../public/comt_datasets'),
      variables = {},
      dataset = {};
  datasets.dataset.every(function (e, i) {
    if (e.title.replace(/[^\w]/g, '-').toLowerCase() === datasetTitle) {
      dataset = e;
      return false;
    }
    else
      return true;
  });
  if (dataset.variablesColored === undefined) {
    variables = require('../public/variables')
    for (var i=0; i<dataset.variablesMeasured.length;i++) {
      variables.variables.every(function (variableWithColor) {
        if (variableWithColor[1] !== '#000000' && variableWithColor[0] === dataset.variablesMeasured[i]) {
          dataset.variablesMeasured[i] = variableWithColor;
          return false;
        }
        else
          return true;
      });
    }
    dataset.variablesColored = true;
  }
  var findProjectTitle = new pq('SELECT title FROM projects WHERE title_key = $1', req.params.title_key);
  if (db === undefined)
    db = pgp(connectionstring);
  db.one(findProjectTitle)
    .then(function (project) {
      res.render('comt/dataset', {
        title: 'The U.S. Integrated Ocean Observing System (IOOS) | Coastal and Ocean Modeling Testbed Projects | ' + project.title + ' | Datasets',
        dataset: dataset,
        project: project,
        title_key: req.params.title_key,
        subProjectTitle: req.query.t
      });
    })
    .catch(function (error) {
      console.log('ERROR:', error);
  });
});

module.exports = router;
