

var SimulationClient = require('./devicesSimulation/simulationClient.js');
global.simulationClient = new SimulationClient({simulationConfigFile: "./simulationConfig.json"});
