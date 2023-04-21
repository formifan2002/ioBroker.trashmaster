'use strict';

const utils = require('@iobroker/adapter-core');
const getApiData = require('iobroker.trashmaster/lib/getApiData');
const i18n = require('iobroker.trashmaster/lib/i18n');
const languages = ['en', 'de', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'];
let systemLanguage='';

class Trashmaster extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'trashmaster',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('objectChange', this.onObjectChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	async onReady() {

		const delay = Math.floor(Math.random() * 30000);
        this.log.debug(`Delay execution by ${delay}ms to better spread API calls`);
        await this.sleep(delay);

		systemLanguage = await this.getSystemLanguage();
		await this.initWhatsapp();
		if (this.config.key === '' || this.config.wasteTypes.filter((element) => element.used).length == 0) {
			this.log.error('Configuration of adapter not complete'+(this.config.key === '' ? '(no valid URL maintained)': '(no waste types activated)')+'. Please check und update instance configuration.');
			return;
		}
		await this.initWasteTypes();
		return;
	}

	sleep(ms) {
        return new Promise(resolve => setTimeout(() => !this.unloaded && resolve(), ms));
    }
	
	onUnload(callback) {
		try {
			callback();
		} catch (e) {
			callback();
		}
	}

	onStateChange(id, state) {
		if (state) {
			// the alive status is changed every 2-3 seconds. So only in case the overall
			// status of the config.alive is different to the current status of the
			// whatsapp instance an update of the config is done.
			if (state.val != this.config.whatsapp.alive) {
				this.updateWhatsappStatus(this.config.whatsapp.instances);
			}
		} else {
			// The state was deleted
			// unsubsribe from this (whatsapp alive) status
			this.unsubscribeForeignStatesAsync(id);
			// update the status for the whatsapp instances used in my adapter instance
			this.updateWhatsappStatus(this.config.whatsapp.instances);
		}
	}

	onObjectChange(id, obj) {
		if (obj) {
	 		// The object was changed
			this.getPhoneField(obj.native).then(phoneField => {
				if (phoneField !== ''){
					const phoneNumber = obj.native[phoneField];
					const instance = parseInt(id.replace('system.adapter.whatsapp-cmb.',''));
					if (typeof this.config.whatsapp.instances[instance] !== 'undefined' && this.config.whatsapp.instances[instance].phoneNumber !== phoneNumber){
						// the phone number of this instance has been changed
						this.config.whatsapp.instances[instance].phoneNumber = phoneNumber;
					}
				}
			})
	 		// console.log(`object ${id} changed to: ${JSON.stringify(obj.native)}`);
	 	} else {
	 		// The object was deleted
			this.unsubscribeForeignObjectsAsync(id);
	 	}
	}

	async onMessage(obj) {
		if (typeof obj === 'object') {
			switch (obj.command) {
				case 'getKey': {
					const apiDataKey = await getApiData.getKey(obj.message.url);
					if (obj.callback) this.sendTo(obj.from, obj.command, apiDataKey, obj.callback);
					break;
				}
				case 'getSelects': {
					const apiDataSelects = await getApiData.getSelects(obj.message);
					if (obj.callback) this.sendTo(obj.from, obj.command, apiDataSelects, obj.callback);
					break;
				}
				case 'getWasteTypes': {
					await getApiData
						.getWasteTypes(obj.message)
						.then((apiDataWasteTypes) => {
							if (obj.callback) this.sendTo(obj.from, obj.command, apiDataWasteTypes, obj.callback);
						})
						.catch((err) => {
							this.log.error('Error while retreiving waste types');
							this.log.error(err);
						});
					break;
				}
				case 'initWhatsapp': {
					// used for initialization / update of Whatsapp configuration before opening
					// the settings dialog
					if (obj.callback) {
						await this.initWhatsapp()
							.then( result => {
								this.sendTo(obj.from, obj.command, result, obj.callback);
							});
					}
					break;
				}
				case 'getWasteCalendar': {
					// used for initialization / update of waste types during change
					// in the settings dialog
					if (obj.callback) {
						await this.initWasteTypes(
							obj.message,
						).then((apiDataWasteCalendar) => {
							if (obj.callback) this.sendTo(obj.from, obj.command, apiDataWasteCalendar, obj.callback);
						});
					}
					break;
				}
			}
		}
	}

	async getSystemLanguage(){
		try {
			return await this.getForeignObjectAsync('system.config').then((result) => {
				let language = result.common.language;
				if (languages.findIndex((element) => element == systemLanguage) == -1) {
					language = 'de';
				}
				return language;
			});
		} catch {
			return 'de';
		}
	}

	async getSystemVariable(variable){
		try {
			return await this.getForeignObjectAsync('system.config').then((result) => {
				return result.common[variable];
			});
		} catch {
			console.error(`Cannot get system variable ${variable}`)
			return '';
		}
	}

	async transformDateFormat(){
		let dateFormat = await this.getSystemVariable('dateFormat')
		if (dateFormat !== ''){
			return dateFormat.replace('TT','d').replace('DD','d').replace('MM','m').replace('YYYY','y').replace('JJJJ','y');
		}else{
			return 'd.m.y'
		}
	}

	async initWasteTypes(message) {
		const language = await this.getSystemLanguage();
		return await getApiData
			.getWasteCalendar(
				{key: typeof message === 'undefined' ? this.config.key : message.key,
				city: typeof message === 'undefined' ? this.config.city : message.city,
				district: typeof message === 'undefined' ? this.config.district : message.district,
				street: typeof message === 'undefined' ? this.config.street : message.street,
				houseNumber: typeof message === 'undefined' ? this.config.houseNumber : message.houseNumber,
				wasteTypes: typeof message === 'undefined' ? this.config.wasteTypes : message.wasteTypes
				},
				await this.getTranslatedWeekdays(language),
				await this.getTranslatedMonths(language),
				language,
			)
			.then(async (response) => {
				await this.createWasteTypesDataPoints(response,language);
				return response;
			});
	}

	async initWhatsapp() {
		let ret = {status: 'OK', instances: []};
		return await this.getWhatsappInstances()
			.then(async (result) => {
				if (result.length === 0) {
					ret.status='NOINSTANCES';
					ret.instances = []; // no adapter installations of whatsapp-cmb found
					return;
				}else{
					ret.instances = result;
					await this.updateWhatsappStatus(ret.instances)
				}
				return ret;
			})
	}

	async updateWhatsappStatus(instances) {
		const config = this.config;
		const myThis = this;

		return new Promise(async function (resolve) {
			const used = config.whatsapp.used; // get value, if the whatsapp function is used in the current instance
			const whatsapp = { alive: false, used: used, instances: instances };
			for (let i = 0; i < whatsapp.instances.length; i++) {
				const aliveObj = whatsapp.instances[i].id + '.alive';
				await myThis.subscribeForeignStatesAsync(aliveObj); // subsribe to state change of this instance in order to be informed, when a the instance is deleted or the live status changed
				await myThis.getForeignStateAsync(aliveObj).then((alive) => {
					whatsapp.instances[i].alive = alive.val;
					if (alive.val) {
						whatsapp.alive = true;
					}
				});
			}
			resolve(whatsapp);
		}).then(function (whatsapp) {
			// Update the status of whatsapp for this instance
			myThis.updateConfig({ whatsapp: whatsapp });
			config.whatsapp.alive = whatsapp.alive;
			const isUsed = whatsapp.used ? 'uses' : 'does not use';
			const isAlive = whatsapp.alive ? '' : 'not ';
			myThis.log.info(
				`Updated Whatsapp config for this adapter instance. Overall alive status for use of Whatsapp adapter is now "${isAlive}alive". This instance ${isUsed} the functionality.`,
			);
			return whatsapp;
		});
	}

	async isVisInventwoInstalled() {
		return await this.getObjectViewAsync('system', 'instance', {
			startkey: 'system.adapter.vis-inventwo.',
			endkey: 'system.adapter.vis-inventwo.\u9999',
		}).then((instances) => {
			return instances.rows.length > 0;
		});
	}

	async createVisInventwoDatapoint(language) {
		const datapoint = this.common.name + '.' + this.instance + '.WasteCalendar';
		let widgetCode =
			'[{"tpl":"i-vis-jsontable","data":{"g_fixed":false,"g_visibility":false,"g_css_font_text":false,"g_css_background":false,"g_css_shadow_padding":false,"g_css_border":false,"g_gestures":false,"g_signals":false,"g_last_change":false,"visibility-cond":"==","visibility-val":1,"visibility-groups-action":"hide","iTblRowLimit":"5","iTableRefreshRate":"0","iTblSortOrder":"asc","iColCount":"3","iColShow1":"true","iTblHeadTextAlign1":"left","iTblTextAlign1":"left","iTblCellFormat1":"normal","iTblCellImageSize1":"200","iTblCellBooleanCheckbox1":"false","iTblCellBooleanColorFalse1":"#ff0000","iTblCellBooleanColorTrue1":"#00ff00","iTblCellNumberDecimals1":"2","iTblCellNumberDecimalSeperator1":".","iTblCellNumberThousandSeperator1":",","iTblCellThresholdsDp1":"","iTblCellThresholdsText1":"","iOpacityAll":"1","iTblRowEvenColor":"#333333","iTblRowUnevenColor":"#455618","iTblHeaderColor":"#333333","iRowSpacing":"10","iTblRowEvenTextColor":"#ffffff","iTblRowUnevenTextColor":"#ffffff","iTblHeaderTextColor":"#ffffff","iBorderSize":"0","iBorderStyleLeft":"none","iBorderStyleRight":"none","iBorderStyleUp":"none","iBorderStyleDown":"none","iBorderColor":"#ffffff","signals-cond-0":"==","signals-val-0":true,"signals-icon-0":"/vis/signals/lowbattery.png","signals-icon-size-0":0,"signals-blink-0":false,"signals-horz-0":0,"signals-vert-0":0,"signals-hide-edit-0":false,"signals-cond-1":"==","signals-val-1":true,"signals-icon-1":"/vis/signals/lowbattery.png","signals-icon-size-1":0,"signals-blink-1":false,"signals-horz-1":0,"signals-vert-1":0,"signals-hide-edit-1":false,"signals-cond-2":"==","signals-val-2":true,"signals-icon-2":"/vis/signals/lowbattery.png","signals-icon-size-2":0,"signals-blink-2":false,"signals-horz-2":0,"signals-vert-2":0,"signals-hide-edit-2":false,"lc-type":"last-change","lc-is-interval":true,"lc-is-moment":false,"lc-format":"","lc-position-vert":"top","lc-position-horz":"right","lc-offset-vert":0,"lc-offset-horz":0,"lc-font-size":"12px","lc-font-family":"","lc-font-style":"","lc-bkg-color":"","lc-color":"","lc-border-width":"0","lc-border-style":"","lc-border-color":"","lc-border-radius":10,"lc-zindex":0,"oid":"##datapoint##","iTblShowHead":true,"iColShow2":"true","iTblHeadTextAlign2":"left","iTblTextAlign2":"left","iTblCellFormat2":"datetime","iTblCellImageSize2":"200","iTblCellBooleanCheckbox2":"false","iTblCellBooleanColorFalse2":"#ff0000","iTblCellBooleanColorTrue2":"#00ff00","iTblCellNumberDecimals2":"2","iTblCellNumberDecimalSeperator2":".","iTblCellNumberThousandSeperator2":",","iTblCellThresholdsDp2":"","iTblCellThresholdsText2":"","iColShow3":"true","iTblHeadTextAlign3":"left","iTblTextAlign3":"left","iTblCellFormat3":"normal","iTblCellImageSize3":"200","iTblCellBooleanCheckbox3":"false","iTblCellBooleanColorFalse3":"#ff0000","iTblCellBooleanColorTrue3":"#00ff00","iTblCellNumberDecimals3":"2","iTblCellNumberDecimalSeperator3":".","iTblCellNumberThousandSeperator3":",","iTblCellThresholdsDp3":"","iTblCellThresholdsText3":"","iColName1":"##iColName1##","iColAttr1":"AbfuhrTagLang","iColName2":"##iColName2##","iColAttr2":"AbfuhrtagJson","iTblCellDatetimeFormat2":"##dateFormat##","iColName3":"##iColName3##","iColAttr3":"Abfuhrart","iVertScroll":true,"iTblSortAttr":"AbfuhrtagJson"},"style":{"left":"34px","top":"77px","width":"547px","height":"224px"},"widgetSet":"vis-inventwo"}]';
		widgetCode = widgetCode.replace('##dateFormat##',await this.transformDateFormat());
		widgetCode = widgetCode.replace('##datapoint##', datapoint);
		const col1 = this.getTranslation('VisInventwoColName1', true)[language];
		widgetCode = widgetCode.replace('##iColName1##', col1);
		const col2 = this.getTranslation('VisInventwoColName2', true)[language];
		widgetCode = widgetCode.replace('##iColName2##', col2);
		const col3 = this.getTranslation('VisInventwoColName3', true)[language];
		widgetCode = widgetCode.replace('##iColName3##', col3);
		await this.createDataPointAsync('', '', widgetCode, '', 'VisWidgetCode', true, false);
	}

	async getPhoneField(nativeValues){
		let phoneField = '';
		const fields = Object.keys(nativeValues).filter(
			(el) => el.toUpperCase().indexOf('PHONE') != -1,
		);
		fields.forEach(function (fieldName) {
			phoneField = fieldName;
		});
		return phoneField;
	}

	async getWhatsappInstances() {
		const myThis = this;
		return new Promise(function (resolve) {
			const result = [];
			myThis
				.getObjectViewAsync('system', 'instance', {
					startkey: 'system.adapter.whatsapp-cmb.',
					endkey: 'system.adapter.whatsapp-cmb.\u9999',
				})
				.then(async (instances) => {
					if (typeof instances.rows == 'object') {
						for (let i = 0; i < instances.rows.length; i++) {
							const row = instances.rows[i];
							const phoneField = await myThis.getPhoneField(row.value.native);
							const idSplit = row.id.split('.');
							if (phoneField !==''){
								// subscribe to object changes of the phone number for this instance
								await myThis.subscribeForeignObjectsAsync(`${row.id}`);
							}
							await myThis.getForeignObjectAsync(row.id).then(async (object) => {
								// get the default phone number for this instance..
								const alreadyUsed = await myThis.checkUsed(row.id, myThis.config.whatsapp.instances);
								result.push({
									id: row.id,
									instance: row.id.replace('system.adapter.', ''),
									instanceNumber: idSplit[idSplit.length - 1],
									phoneNumber:
										typeof object.native[phoneField] != 'undefined'
											? object.native[phoneField]
											: '',
									use: alreadyUsed,
									alive: false,
								});
							});
						}
					}
					return resolve(result);
				});
		});
	}

	async checkUsed(id, instances) {
		return new Promise(function (resolve) {
			for (let i = 0; i < instances.length; i++) {
				if (instances[i].id == id) {
					return resolve(instances[i].use);
				}
			}
			return resolve(false);
		});
	}

	sendWhatsapp(celement, cAbfallArt, differenceInDays, whatsappAlarmTage, whatsAppInstance, phoneNumber) {
		const cMessage =
			(differenceInDays == 1 ? 'Morgen ' : differenceInDays == 2 ? 'Übermorgen ' : '') +
			'Abholung ' +
			cAbfallArt +
			(differenceInDays > 2 ? ' in ' + differenceInDays + ' Tagen' : '') +
			' (' +
			celement.AbfuhrTagLang +
			', ' +
			celement.Abfuhrdatum +
			').';
		// console.log(`will send message to ${phoneNumber} with instance ${whatsAppInstance}`);
		// console.log(cMessage);
		this.sendTo(whatsAppInstance, 'send', {
				text: cMessage,
				phone: phoneNumber // optional, if empty the message will be sent to the default configured number
			});
	}

	async createWasteTypesDataPoints(wasteCalendar,lang) {
		const datapoint = 'Abfuhrdaten';
		const language = typeof lang === 'undefined' ? await this.getSystemLanguage() : lang;
		await this.setStateAsync('WasteCalendar', {
			val: wasteCalendar.json,
			ack: true,
		});
		if (wasteCalendar.error != ''){
			return false;
		}
		if (await this.isVisInventwoInstalled()) {
			// VIS widget inventwo is installed - create datapoint for JSON table
			this.log.info('VIS inventwo widget found. Will create according datapoint "VisWidgetCode".');
			await this.createVisInventwoDatapoint(language);
		} else {
			//console.log('No installation of VIS inventwo widget found.');
		}
		try {
			const channels = await this.getChannelsAsync('');
			// delete all channels (each waste type is a channel in the obect 'Abfallarten')
			for (let i = 0; i < channels.length; i++) {
				const channelName = channels[i]._id.substring(channels[i]._id.lastIndexOf('.')+1)
				try {
					await this.deleteChannelAsync(datapoint,channelName);
					this.delObjectAsync
				} catch (err) {
					console.error('Error while trying to delete the channel ' + channelName);
					console.error(err);
				}
			}
			// create folder for all waste types
			await this.setObjectAsync(datapoint, {
				common: {
					name: this.getTranslation(datapoint, true),
					desc: this.getTranslation(datapoint, false),
				},
				native: {},
				type: 'folder',
			}).then(async () => {
				const dToday = new Date(Date.now());
				for (let i = 0; i < this.config.wasteTypes.length; i++) {
					if (!this.config.wasteTypes[i].used) {
						continue;
					}
					const channelName = datapoint + '.' + this.config.wasteTypes[i].titleDatapoint;
					// create device for specific waste type
					await this.setObjectAsync(channelName, {
						common: {
							name: this.getTranslation('Muellart', true, ' ' + this.config.wasteTypes[i].title),
							desc: this.getTranslation('Muellart', false, ' ' + this.config.wasteTypes[i].title),
						},
						native: {},
						type: 'channel',
					})
						.then(async () => {
							if (this.config.whatsapp.used == true) {
								await this.createDataPointAsync(
									channelName,
									'',
									this.config.wasteTypes[i].whatsapp,
									'',
									'WhatsappTage',
								);
							}
							return true;
						})
						.then(async () => {
							await this.createDataPointAsync(
								channelName,
								'',
								this.config.wasteTypes[i].blink,
								'',
								'BlinkenTage',
							);
							return true;
						})
						.then(async () => {
							JSON.parse(wasteCalendar.json)
								.filter((aelement) => aelement.AbfuhrartNr == this.config.wasteTypes[i].value)
								.map(async (celement, index) => {
									// create channel for specific day
									const differenceInDays = await this.differenceInDays(celement, dToday);
									if (this.config.createDatapoints === true) {
										// create folder for each collection day
										const deviceName = channelName + '.' + celement.Datenpunkt;
										await this.createFolderDatapoints(
											channelName,
											deviceName,
											celement,
											differenceInDays,
										);
									}
									if (index == 0) {
										let enhancedElement={...celement,...{'Blinken': celement.Resttage <= this.config.wasteTypes[i].blink}}
										if (this.config.whatsapp.used == true) {
											enhancedElement={...enhancedElement,...{'Whatsapp': celement.Resttage <= this.config.wasteTypes[i].whatsapp}}
										}
										await this.createDetailledDataPointsAsync(
											channelName,
											'',
											enhancedElement,
										);
										if (
											this.config.whatsapp.used == true &&
											this.config.wasteTypes[i].whatsapp != -1 &&
											this.config.wasteTypes[i].whatsappCollectionDateSend !=
												celement.Abfuhrdatum &&
											celement.Resttage <= this.config.wasteTypes[i].whatsapp
										) {
											// prevent to send again a Whatsapp for this collection date
											this.config.wasteTypes[i].whatsappCollectionDateSend = celement.Abfuhrdatum;
											this.config.whatsapp.instances.map((element) => {
												this.sendWhatsapp(
													celement,
													this.config.wasteTypes[i].title,
													differenceInDays,
													this.config.wasteTypes[i].whatsapp,
													element.instance,
													element.phoneNumber,
												);
											});
										}
									}
								});
						});
				} // for
			});
		} catch (err) {
			console.error('Error while creating data points for waste calendar (function createAbfallartenDatenpunkte');
			console.error(err);
			return false;
		}
	}

	async createFolderDatapoints(channelName, deviceName, celement, differenceInDays) {
		await this.setObjectAsync(deviceName, {
			common: {
				name: this.getTranslation('DatumOrdner', true, ' ' + celement.Datenpunkt),
				desc: this.getTranslation('DatumOrdner', false, ' ' + celement.Datenpunkt),
			},
			native: {},
			type: 'device',
		}).then(async () => {
			await this.createDetailledDataPointsAsync(channelName, deviceName, celement);
		});
	}

	async createDetailledDataPointsAsync(channelName, deviceName, celement) {
		const path = deviceName == '' ? '' : celement.Datenpunkt;
		const promise1 = await this.createDataPointAsync(channelName, deviceName, celement.Abfuhrdatum, path, 'Datum');
		const promise2 = await this.createDataPointAsync(
			channelName,
			deviceName,
			celement.AbfuhrTagLang,
			path,
			'TagName',
		);
		const promise3 = await this.createDataPointAsync(
			channelName,
			deviceName,
			celement.AbfuhrTagKurz,
			path,
			'TagNameKurz',
		);
		const promise4 = await this.createDataPointAsync(
			channelName,
			deviceName,
			celement.Monatsname,
			path,
			'Monatsname',
		);
		const promise5 = await this.createDataPointAsync(channelName, deviceName, celement.Monat, path, 'Monat');
		const promise6 = await this.createDataPointAsync(channelName, deviceName, celement.Jahr, path, 'Jahr');
		const promise7 = await this.createDataPointAsync(channelName, deviceName, celement.Tag, path, 'Tag');
		const promise8 = await this.createDataPointAsync(channelName, deviceName, celement.Resttage, path, 'Resttage');
		const promise9 = await this.createDataPointAsync(channelName, deviceName, JSON.stringify(celement), path, 'JSON',true,false);
		return Promise.all([promise1, promise2, promise3, promise4, promise5, promise6, promise7, promise8,promise9]).then(
			async () => {
				if (typeof celement.Blinken!='undefined'){
					await this.createDataPointAsync(channelName, deviceName, celement.Blinken, path, 'Blinken');
				}
				if (typeof celement.Whatsapp!='undefined'){
					await this.createDataPointAsync(channelName, deviceName, celement.Whatsapp, path, 'Whatsapp');
				}
				return true;
			},
		);
	}

	async createDataPointAsync(parentChannel, parentDevice, val, path, dataPointName, read, write) {
		try {
			const dpName =
				(parentChannel == '' ? '' : parentChannel + '.') + (path == '' ? '' : path + '.') + dataPointName;
			const ret = await this.setObjectAsync(dpName, {
				common: {
					name: dataPointName=='JSON'?'JSON':this.getTranslation(dataPointName, true),
					desc: dataPointName=='JSON'?'JSON': this.getTranslation(dataPointName, false),
					type: typeof val == 'string' || typeof val == 'object' ? 'string' : typeof val == 'boolean' ? 'boolean' : 'number',
					role: 'state',
					read: typeof read == 'undefined' ? true : read,
					write: typeof write == 'undefined' ? true : write,
				},
				native: {},
				type: 'state',
			}).then(() => {
				this.setStateAsync(dpName, val, true);
				return true;
			});
			return ret;
		} catch (err) {
			console.error(
				'Error during creation of datapoint ' +
					parentDevice +
					'.' +
					(parentChannel == '' ? '' : parentChannel + '.') +
					dataPointName +
					'.',
			);
			console.error(err);
			return false;
		}
	}

	async differenceInDays(celement, dToday) {
		const date2 = new Date(
			parseInt(celement.Jahr),
			parseInt(celement.Monat) - 1,
			parseInt(celement.Abfuhrdatum.substr(0, 2)),
		);
		date2.setHours(dToday.getHours());
		date2.setMinutes(dToday.getMinutes());
		date2.setSeconds(dToday.getSeconds());
		const difference = (date2.getTime() - dToday.getTime()) / (1000 * 3600 * 24);
		const ret =
			Math.floor(difference * 100) - Math.floor(difference) * 100 > 0
				? Math.floor(difference) + 1
				: Math.floor(difference);
		return ret;
	}

	getTranslation(dp, name, additionalText) {
		/* tranforms all language entries for this datapoint name into one object
			translation file "i18n.json" is saved in directory \lib
		*/
		const dpSearch = 'dp' + dp + (name == true ? 'Name' : 'Desc');
		const obj = {};
		for (let i = 0; i < languages.length; i++) {
			obj[languages[i]] =
				typeof i18n[languages[i]] == 'undefined' || typeof i18n[languages[i]][dpSearch] == 'undefined'
					? 'Missing (' + languages[i] + ') translation for ' + dpSearch
					: i18n[languages[i]][dpSearch] + (typeof additionalText == 'undefined' ? '' : additionalText);
		}
		return obj;
	}

	async getTranslatedWeekdays(language) {
		/* tranforms all language entries for this datapoint name into one object
			translation file "i18n.json" is saved in directory \lib
		*/
		return [
			i18n[language]["Sunday"],
			i18n[language]["Monday"],
			i18n[language]["Tuesday"],
			i18n[language]["Wednesday"],
			i18n[language]["Thursday"],
			i18n[language]["Friday"],
			i18n[language]["Saturday"]
		]
	}

	async systemLanguage(){
		const language = await this.getSystemLanguage();
		return language;
	}

	async getTranslatedMonths(language) {
		/* tranforms all language entries for this datapoint name into one object
			translation file "i18n.json" is saved in directory \lib
		*/
		return [
			i18n[language]["January"],
			i18n[language]["February"],
			i18n[language]["March"],
			i18n[language]["April"],
			i18n[language]["May"],
			i18n[language]["June"],
			i18n[language]["July"],
			i18n[language]["August"],
			i18n[language]["September"],
			i18n[language]["October"],
			i18n[language]["November"],
			i18n[language]["December"]
		]
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Trashmaster(options);
} else {
	// otherwise start the instance directly
	new Trashmaster();
}
