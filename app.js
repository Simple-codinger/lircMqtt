#!/usr/bin/env node

const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://10.13.200.40')

var exec = require('child_process').exec;
var sleep = require('sleep')
const config = require('config')
var util = require('util')

var remoteDeviceConfig = config.get('remoteDevice');
var remoteDeviceKeys = Object.keys(remoteDeviceConfig);

client.on('connect', function(){
  var topic;
  for(var i = 0, len = remoteDeviceKeys.length; i < len; i++){
    topic = 'remote/' + remoteDeviceKeys[i];
    client.subscribe(topic);
    console.log('subscribed to ' + topic);
  }
});

client.on('message', (topic, message) => {
  console.log('topic: ' + topic + '  message: ' + message);
  var deviceName = topic.replace(/^remote\//, '');
  var remoteDevice = remoteDeviceConfig[deviceName];
  var device = remoteDevice.device;
  var remoteKey;
  var command = 'irsend SEND_ONCE %s %s';
  var commandList = [];

  var m = message.toString();
  if(m.startsWith('ChangeChannel')){
    var keyPrefix = remoteDevice.keyMap['ChangeChannel'];

    var channel = m.match(/ChangeChannel (.*)/)[1];
    if(isNaN(channel)){
      console.log('ERROR: channel was not a number: ' + channel);
      return;
    }
    var i = channel.length;
    while(i--){
      remoteKey = keyPrefix + channel[i];
      commandList.push(util.format(command, device, remoteKey));
    }
    command = util.format(command, device, remoteKey);
  }
  else{
    remoteKey = remoteDevice.keyMap[m];
    commandList.push(util.format(command, device, remoteKey));
  }
  executeIrsend(commandList);
});

// sending seperate commands spaced out by 500ms because multiple keys
// in one irsend command is too fast for my Cable box to pick up.
var executeIrsend = function(commandList){
  var result;
  var irCommand = commandList.pop();
  exec(irCommand, (error, stdout, stderr) => {
    result = stdout.trim();
    if(!result){
      console.log('success executing: ' + irCommand);
      if(commandList.length > 0){
        sleep.msleep(500);
        executeIrsend(commandList);
      }
    } else {
      console.log('ERROR: ' + error);
    }
  });
};
