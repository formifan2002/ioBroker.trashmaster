import React, { useState, useEffect } from 'react';
import withStyles from '@mui/styles/withStyles';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import Input from '@mui/material/Input';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';
import CircularProgress from '@mui/material/CircularProgress';
import SettingsWasteTypes from './settingWasteTypes';

const styles = () => ({
	input: {
		marginTop: 0,
		minWidth: 400,
	},
});

let allCities = [];
let allDistricts = [];
let allStreets = [];
let allHouseNumbers = [];
function Settings(props) {
	const { native, state, thisis, updateNativeValue, sendMessage, tabChange, setTabChange } = props;
	const { i18n } = useTranslation();
	const [showLoader, setShowLoader] = useState(false);
	const [showWasteTypesLoader, setShowWasteTypesLoader] = useState(false);
	const [validKey, setValidKey] = useState(native.key != '');
	const [initializing, setInitializing] = useState(true);
	useEffect(() => {
		firstRender();
	}, []);

	const firstRender = async () => {
		await i18n.changeLanguage(thisis._systemConfig.language);
		if (tabChange) {
			setTabChange(false);
			setInitializing(false);
		} else {
			startSettings();
		}
	};

	const startSettings = async () => {
		if (validKey) {
			let responseCities={type: ''};
			if (native.city !== '' && allCities.length === 0) {
					responseCities=  await getSelects(native.key);
					if (responseCities.type !== 'streets'){
						allCities = responseCities.selects;
					}
			}
			if (responseCities.type !== 'streets' && native.district !== '' && allDistricts.length === 0) {
					const responseDistricts = await getSelects(native.key, native.city);
					allDistricts = responseDistricts.selects;
			}
			if (native.street !== '' && allStreets.length === 0) {
					if (responseCities.type !== 'streets' === false){
						const response = await getSelects(native.key, native.city,native.district);
						allStreets = response.selects;
					}else{
						allStreets = responseCities;
					}
			}
			if (native.houseNumber !== '' && allHouseNumbers.length === 0) {
				const responseHouseNumbers = await getSelects(native.key, native.city,native.district,native.street);
				allHouseNumbers = responseHouseNumbers.selects;
			}
		}
		setInitializing(false);
	};

	async function initWasteTypes() {
		if (typeof native.street === 'undefined' || native.street === '') {
			if (native.wasteTypes.length > 0) {
				updateNativeValue('wasteTypes', []);
			}
		} else {
			setShowWasteTypesLoader(true);
			const allWasteTypes = await sendMessage('getWasteTypes', {
				key: native.key,
				city: native.city,
				district: native.district,
				street: native.street,
				houseNumber: native.houseNumber,
			});
			setShowWasteTypesLoader(false);
			updateNativeValue('wasteTypes', allWasteTypes);
		}
	}

	useEffect(() => {
		if (tabChange === false && initializing === false && typeof native.url !== 'undefined') {
			handleChangeUrl();
		}
	}, [native.url]);

	const handleChangeUrl = async () => {
		const newKey = await isValidHttpUrl(native.url)
		.then(async validUrl => {
			if (validUrl === false) return '';
			setShowLoader(true);
			const response = await sendMessage('getKey', { url: native.url });
			setShowLoader(false);
			return response;
		})
		.then(response => {
			if (response.key != native.key) {
				updateNativeValue('key', response.key);
			}
			return response.key;
		});
		return newKey;
	};

	useEffect(() => {
		if (tabChange === false && initializing === false && typeof native.key !== 'undefined') {
			handleChangeKey();
		}
	}, [native.key]);

	const handleChangeKey = async () => {
		setValidKey(native.key !== '');
		if (native.city !== ''){
			updateNativeValue('city', '');
		}else{
			handleChangeCity();
		}
	};

	useEffect(() => {
		if (tabChange === false && initializing === false && typeof native.city !== 'undefined') {
			handleChangeCity();
		}
	}, [native.city]);

	const handleChangeCity = async (showCity) => {
		if (native.city === ''){
			allCities = [];
			allDistricts = [];
			allStreets = [];
			allHouseNumbers = [];
			const response = await getSelects(native.key);
			if (response.error !== '') {
				updateNativeValue('key', '');
				return;
			} else {
				if (parseInt(response.commune) === 0){
					allCities = response.selects;
				}else{
					if (parseInt(response.district) === 0){
						allDistricts = response.selects;
						if (native.district !== '') {
							updateNativeValue('district', '');
						} else {
							handleChangeDistrict(true);
						}
						return;
					}else{
						updateNativeValue('city', response.commune);
						return;
					}
				}
			}
		}else{
			if (allCities.length === 0){
				const response = await getSelects(native.key);
				updateNativeValue('district', response.district);
				return;
			}else{
				const response = await getSelects(native.key,native.city);
				allDistricts = response.selects;
			}
		}
		if (native.district === '' && allDistricts.length > 1) {
			handleChangeDistrict(true);
		} else {
			updateNativeValue('district', allDistricts.length === 1 ? allDistricts[0].value : '');
		}
	};

	useEffect(() => {
		if (tabChange === false && initializing === false && typeof native.district !== 'undefined') {
			handleChangeDistrict();
		}
	}, [native.district]);

	const handleChangeDistrict = async (showDistrict) => {
		if (native.district === ''){
			allStreets = []
		}else{
			const response = await getSelects(native.key,native.city,native.district);
			allStreets = response.selects;
		}
		if (native.street === '' && (allStreets.length > 1 || allStreets.length === 0)) {
			handleChangeStreet(true);
		} else {
			updateNativeValue('street', allStreets.length === 1 ? allStreets[0].value : '');
		}
	};

	useEffect(() => {
		if (tabChange === false && initializing === false && typeof native.street !== 'undefined') {
			handleChangeStreet();
		}
	}, [native.street]);

	const handleChangeStreet = async (showStreet) => {
		if (native.street === '' || allStreets.length === 1){
			allHouseNumbers = []
		}else{
			const response = await getSelects(native.key,native.city,native.district,native.street);
			if (response.type === 'WasteCalendar'){
				// the API already returned a waste calendar since no housenumbers exist for this street
				allHouseNumbers = [];
				updateNativeValue('wasteTypes', []);
			}else{
				allHouseNumbers = response.selects;
			}
		}
		if (native.houseNumber === '' && (allHouseNumbers.length > 1 || allHouseNumbers.length === 0)) {
			handleChangeHouseNumber();
		} else {
			updateNativeValue('houseNumber', allHouseNumbers.length === 1 ? allHouseNumbers[0].value : '');
		}
	};

	useEffect(() => {
		if (tabChange === false && initializing === false && typeof native.houseNumber !== 'undefined') {
			handleChangeHouseNumber();
		}
	}, [native.houseNumber]);

	const handleChangeHouseNumber = async () => {
		if (tabChange === false) {
			if (
				typeof native.street !== 'undefined' &&
				native.street !== '' &&
				(allHouseNumbers.length < 2 || (allHouseNumbers.length > 1 && native.houseNumber !== ''))
			) {
				initWasteTypes();
			} else {
				if (native.wasteTypes.length !== 0) {
					updateNativeValue('wasteTypes', []);
				}
			}
		}
	};

	function changeField(attr, newValue) {
		updateNativeValue(attr, newValue);
	}

	const RenderUrl = () => (
		<TextField
			label={i18n.t('URL')}
			className="url-class"
			value={native.url}
			type="text"
			onChange={(event) => changeField('url', event.target.value)}
			margin="normal"
			size="small"
			autoFocus="true"
			fullWidth
		/>
	);

	const RenderSelectCity = () => (
		<FormControl
			className="city-class"
			style={{
				paddingTop: 5,
			}}
		>
			<Select
				value={native.city}
				displayEmpty
				onChange={(event) => changeField('city', event.target.value)}
				input={<Input name="city" id="city-id" />}
				label={i18n.t('City')}
				renderValue={(selected) => {
					if (selected === '' || native.city === '' || allCities.filter(element => element.value === selected).length === 0) {
					  return <em>{i18n.t('Select city')}</em>;
					}
					return allCities.filter(element => element.value === selected)[0].title;
				  }}
				style={{marginLeft: '15px'}}
			>
				<MenuItem disabled value="">
					<em>{i18n.t('Select city')}</em>
				</MenuItem>
				{allCities.map((item) => (
					<MenuItem key={item.value} value={item.value}>
						{item.title}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);

	const RenderSelectDistrict = () => (
		<FormControl
			className="district-class"
			style={{
				paddingTop: 5,
			}}
		>
			<Select
				value={native.district}
				displayEmpty
				onChange={(event) => changeField('district', event.target.value)}
				input={<Input name="district" id="district-id" />}
				label={i18n.t('District')}
				renderValue={(selected) => {
					if (selected === '' || native.district === '' || allDistricts.filter(element => element.value === selected).length === 0) {
					  return <em>{i18n.t('Select district')}</em>;
					}
					return allDistricts.filter(element => element.value === selected)[0].title;
				  }}
				style={{marginLeft: '15px'}}
			>
				<MenuItem disabled value="">
					<em>{i18n.t('Select district')}</em>
				</MenuItem>
				{allDistricts.map((item) => (
					<MenuItem key={item.value} value={item.value}>
						{item.title}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);

	const RenderSelectStreet = () => (
		<FormControl
			className="street-class"
			style={{
				paddingTop: 5,
			}}
		>
			<Select
				value={native.street}
				displayEmpty
				onChange={(event) => changeField('street', event.target.value)}
				input={<Input name="street" id="street-id" />}
				label={i18n.t('Street')}
				renderValue={(selected) => {
					if (selected === '' || native.street === '' || allStreets.filter(element => element.value === selected).length === 0) {
					  return <em>{i18n.t('Select street')}</em>;
					}
					return allStreets.filter(element => element.value === selected)[0].title;
				  }}
				style={{marginLeft: '15px'}}
			>
				<MenuItem disabled value="">
					<em>{i18n.t('Select street')}</em>
				</MenuItem>
				{allStreets.map((item) => (
					<MenuItem key={item.value} value={item.value}>
						{item.title}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);

	const RenderSelectHouseNumber = () => (
		<FormControl
			className="housenumber-class"
			style={{
				paddingTop: 5,
			}}
		>
			<Select
				value={native.houseNumber}
				displayEmpty
				onChange={(event) => changeField('houseNumber', event.target.value)}
				input={<Input name="housenumber" id="housenumber-id" />}
				label={i18n.t('HouseNumber')}
				id="housenumber-select"
				renderValue={(selected) => {
					if (selected === '' || native.houseNumber === '' || allHouseNumbers.filter(element => element.value === selected).length === 0) {
					  return <em>{i18n.t('Select house number')}</em>;
					}
					return allHouseNumbers.filter(element => element.value === selected)[0].title;
				  }}
				style={{marginLeft: '15px'}}
			>
				<MenuItem disabled value="">
					<em>{i18n.t('Select house number')}</em>
				</MenuItem>
				{allHouseNumbers.map((item) => (
					<MenuItem key={item.value} value={item.value} id="HouseNumber-select-menuitem">
						{item.title}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);

	async function getSelects(key,city,district,street) {
		setShowLoader(true);
		const response = await sendMessage('getSelects', { 
			key: key, 
			city: (typeof city === 'undefined' ? '' : city),
			district: (typeof district === 'undefined' ? '' : district),
			street: (typeof street === 'undefined' ? '' : street),
		 });
		setShowLoader(false);
		return response;
	}

	async function isValidHttpUrl(url) {
		try {
			const validUrl = new URL(url);
			return validUrl.protocol === 'http:' || validUrl.protocol === 'https:';
		} catch (err) {
			return false;
		}
	}

	return (
		<form className="form-Settings-class">
			<Grid container rowSpacing={0.5} direction="row" alignItems="baseline" spacing={1.5}>
				<Grid item xs={12} md={12}>
					<RenderUrl />
					{showLoader === true && <CircularProgress color="success" style={{ display: 'block', margin: 'auto' }} />}
				</Grid>
				<Grid container xs={12} md={3} style={{marginTop: '10px'}} rowSpacing={2.0}>
					<Grid item xs={12} md={12}>
						{showLoader == false && initializing == false && validKey === true && allCities.length > 1 && (
							<RenderSelectCity />
						)}
					</Grid>
					<Grid item xs={12} md={12}>
						{showLoader == false && initializing == false && validKey === true && allDistricts.length > 1 && (
							<RenderSelectDistrict />
						)}
					</Grid>
					<Grid item xs={12} md={12}>
						{showLoader == false && initializing == false && validKey === true && allStreets.length > 1  && (
							<RenderSelectStreet />
						)}
					</Grid>
					<Grid item xs={12} md={12}>
						{showLoader == false && initializing == false && validKey === true && allHouseNumbers.length > 1  && (
							<RenderSelectHouseNumber />
						)}
					</Grid>
				</Grid>
				<Grid container xs={12} md={9} spacing={1.5}>
					{showLoader == false && initializing == false && validKey === true && native.wasteTypes.length > 0 && (
						<SettingsWasteTypes
							showWasteTypesLoader={showWasteTypesLoader}
							updateNativeValue={updateNativeValue}
							native={native}
							state={state}
							i18n={i18n}
							sendMessage={sendMessage}
						/>
					)}
				</Grid>
			</Grid>
		</form>
	);
}

export default withStyles(styles)(Settings);
