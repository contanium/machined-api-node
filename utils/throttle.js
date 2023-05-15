const fastq = require("fastq");

const queues = {};

async function perSecond(){
    await new Promise(resolve => setTimeout(resolve, 1000));
}

async function perMinute(){
    await new Promise(resolve => setTimeout(resolve, 60000));
}

async function create(key, capacity){
    queues[key] = fastq.promise(perSecond, capacity);

    queues[key].saturated = () => console.log(`THROTTLE: ${key} queue saturated`);
    queues[key].empty = () => console.log(`THROTTLE: ${key} queue emptied`);
}

async function createM(key, capacity){
    queues[key] = fastq.promise(perMinute, capacity);

    queues[key].saturated = () => console.log(`THROTTLE: ${key} queue saturated`);
    queues[key].empty = () => console.log(`THROTTLE: ${key} queue emptied`);
}

async function check(key) {
    await queues[key].push(key);
}

module.exports = { create, check, createM };