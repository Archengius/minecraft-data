var bot = require('nodemw');
var _ = require('underscore');

module.exports = WikiTextParser;

function WikiTextParser()
{
  this.client= new bot({
    server: 'minecraft.gamepedia.com',
    path: '/',
    debug: false
  });
}



WikiTextParser.prototype.getArticle=function(title,cb)
{
  this.client.getArticle(title, function(err, data) {
    if (err) {
      console.error(err);
      return;
    }
    cb(data);
  });
};


function extractTitle(titleLine) {
  return titleLine.replace(/=|\[|\]/g,"").trim();
}

function extractDepth(titleLine) {
  var depth = 0;
  for (var x = 0; x < titleLine.length; x++) {
    var c = titleLine.charAt(x);
    if (c == '=')
      depth++;
    else return depth;
  }
}

function findFirstDefinedDepth(sections,currentDepth)
{
  for(var i=currentDepth-1;i>=0;i--)
  {
    if(i in sections)
      return i;
  }
  return -1;
}


if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str) {
    return this.slice(0, str.length) == str;
  };
}
WikiTextParser.prototype.pageToSectionObject = function(data) {
  var currentDepth = 0;
  var a = data.split("\n");
  var m = {};
  var currentLineArray = [];
  var currentTitle = "";
  var currentSection = {};
  var previousSections = {0: m};//indexed by depth
  a.forEach(function (line) {
    if (line.startsWith("=")) {
      if (currentLineArray.length != 0) {
        previousSections[currentDepth]["content"] = currentLineArray;
        currentLineArray = [];
      }
      currentTitle = extractTitle(line);
      currentDepth = extractDepth(line);

      var p=findFirstDefinedDepth(previousSections,currentDepth);
      var newSection={};
      previousSections[p][currentTitle] = newSection;
      previousSections[currentDepth] = newSection;
      currentSection = newSection;
    }
    else
      currentLineArray.push(line);
  });
  previousSections[currentDepth]["content"] = currentLineArray;
  return m;
};


WikiTextParser.prototype.parseTable = function(sectionLineArray)
{
  var array=[];
  sectionLineArray.forEach(function(line){
    if(line.startsWith("{{") && line != "{{-}}")
      array.push(line.replace(/{|}/g,"").split("|"));
  });
  return array;
};

WikiTextParser.prototype.parseInfoBox = function(sectionLineArray)
{
  var infoBox={};
  infoBox["values"]={};
  sectionLineArray.forEach(function(line) {
    if (line.startsWith("{{"))
      infoBox["template"] = line.replace(/{|}/g, "");
    if (line.startsWith("|")) {
      var keyAndValue=line.replace(/\|/g,"").split("=");
      infoBox["values"][keyAndValue[0]]=keyAndValue[1];
    }
  });
  return infoBox;
};