
var jwt = require('jsonwebtoken');
var ObjectId = require('mongodb').ObjectID;
var User = require('../user/models/user');
var FingerPrint = require('./models');
var Station = require('../station/models');
var config = require('../../configs');
var logging = require('../utils/logging');
var logger = logging.get_logger("finger_print");

exports.get_finger_print = function(req, res, next){
    var station_key = req.headers['x-station-key'];
    var provider_key =  req.headers['x-provider-key'];
    if(station_key && provider_key){
        try{
            query_dict = {
                "_id":ObjectId(station_key),
                "provider":ObjectId(provider_key)
            };
            logger.debug("Starting get finger print list of station: " + query_dict);
            Station.findOne(query_dict, (err, station)=>{
                if(err){
                    logger.warn(err.message);
                    return res.status(400).send({error: err.message});
                }else{
                    if(!station){
                        logger.warn('Station key not found.');
                        return res.status(404).send({error: 'Station key not found.'});
                    }
                    FingerPrint.find({}, { finger_print: 1, user: 1, updatedAt:1, _id:0}, (error, finger_prints)=>{
                        if(error){
                            logger.warn(err.message);
                            return res.status(400).send({error: error});
                        }
                        logger.debug("Get finger print result: " + finger_prints);
                        return res.status(200).send({message:{ fingerprint : finger_prints}});
                    })
                }
            });
        }catch(e){
            logger.error(e);
            return res.status(500).send({error: e.message});
        }
    }else{
        logger.warn('Missing require header(s).');
        return res.status(400).send({error: 'Missing require header(s).'});
    }
}

exports.finger_print_login = function(req, res, next){
    var station_key = req.headers['x-station-key'];
    var provider_key =  req.headers['x-provider-key'];
    var user_key = req.headers['x-user-key']
    if(station_key && user_key && provider_key){
        try{
            query_dict = {
                "_id":ObjectId(station_key),
                "provider":ObjectId(provider_key)
            };
            logger.debug("Starting login from finger print of: " + user_key);
            Station.findOne(query_dict, (err, station)=>{
                if(err || !station){
                    logger.warn('Station key not found.');
                    return res.status(404).send({error: 'Station key not found.'});
                }
                User.find({'_id': ObjectId(user_key)},{id_card:1, firsttime:1, first_time_key:1}, (error, user)=>{
                    if(error){
                        logger.warn(error.message);
                        return res.status(404).send({error: error.message});
                    }
                    if(user.length == 0){
                        logger.warn('Cannot find user with this user id: ' + user_key);
                        return res.status(404).send({error: "Cannot find user"});
                    }

                    res.status(200).json({
                        token: 'JWT ' + generateToken(user),
                        data: user[0]
                    });
                })

            });
        }catch(err){
            logger.error('Missing require header(s).');
            return res.status(500).send({error: err.message});
        }
    }else{
        logger.warn('Missing require header(s).');
        return res.status(400).send({error: 'Missing require header(s).'});
    }
}

exports.register_finger_print = function(req, res, next){ // register FINGER_PRINT
    // Will be obsolete soon.
    var info = req.body;
    var station_key = req.headers['x-station-key'];
    var provider_key =  req.headers['x-provider-key'];

    if(station_key && provider_key){
        try{
            query_dict = {
                "_id":ObjectId(station_key),
                "provider":ObjectId(provider_key)
            };
            Station.findOne(query_dict, (err, station)=>{
                if(err){
                    res.status(500).send({err:'MongoDB cannot find this user'});
                    return next(err);
                }
                if(station && station.active){
                    if(info.fingerPrint && info.userId){
                        User.findOne({"_id": ObjectId(info.userId)}, (err, existed)=>{
                            if(err){
                                res.status(500).send({err:'MongoDB cannot find this user'});
                                return next(err);
                            }
                            if(existed){
                                var finger_print = new FingerPrint({
                                    finger_print: info.fingerPrint,
                                    user: existed._id
                                })
                                finger_print.save((err, user)=>{

                                    if(err){
                                        res.status(400).send({error: err.message});
                                        return next(err);
                                    }
                                    res.status(201).send({error:false});
                                });
                            }else{
                                return res.status(404).send({error: 'Cannot find user'});
                            }
                        })
                    }else{
                        return res.status(400).send({error : 'Missing field in json'});
                    }
                }else{
                    return res.status(404).send({error: 'Cannot find station'});
                }
            })
        }catch(e){
            return res.status(500).send({error: e.message});
        }
    }else{
        return res.status(400).send({error: 'Missing require header(s).'});
    }
}


function generateToken(user){
    info = {
        _id: user._id,
        thaiFullName : user.thaiFullName,
        engFullName : user.engFullName
    }
    return jwt.sign(info, config.secret, {
        expiresIn: 6000
    });
}