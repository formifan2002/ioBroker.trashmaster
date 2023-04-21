import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import OutlinedInput from '@mui/material/OutlinedInput';
import ListItemText from '@mui/material/ListItemText';

export default function SettingsDetails(props) {
	const {updateNativeValue,sendMessage} = props.props;
	const {state} = props.this;
	const {whatsapp,createDatapoints,wasteCalendar,wasteTypes} = state.native;
	const { i18n } = useTranslation();
	const [phoneNumbersUsed, setPhoneNumbersUsed] = useState([]);
	const ITEM_HEIGHT = 48;
	const ITEM_PADDING_TOP = 8;
	const MenuProps = {
		PaperProps: {
			style: {
				maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
				width: 250,
			},
		},
	};

	function changeCheckboxField(oldValue, newValue, attr) {
		updateNativeValue(attr, newValue);
	}

	useEffect(() => {
		init();
	}, []);

	useEffect(() => {
		if (state.changed && typeof whatsapp.used != 'undefined') {
			handleChangeWhatsapp();
		}
	}, [whatsapp.used]);

	async function init() {
		await i18n.changeLanguage(props.this._systemConfig.language);
		const response = await initWhatsapp();
		initWhatsappPhoneNumbers(response.instances);
	}

	async function initWhatsapp() {
		// update the configuration of the whatsapp instances, because they might have changed
		// since the settings dialog was opened the last time
		const response = await sendMessage('initWhatsapp', { notneeded: 'notneeded' });
		if (response.status != 'OK' && whatsapp.used !== false) {
			updateNativeValue(`whatsapp.used`, false);
		}
		return response;
	}

	async function initWhatsappPhoneNumbers(instances) {
		const selectedNumbers = [];
		for (let i = 0; i < instances.length; i++) {
			if (instances[i].use) {
				selectedNumbers.push(i.toString());
			}
		}
		setPhoneNumbersUsed(selectedNumbers);
		return true;
	}

	const handleChangeWhatsapp = async () => {
		if (whatsapp.used === false) {
			for (let i = 0; i < whatsapp.instances.length; i++) {
				if (whatsapp.instances[i].use === true) {
					updateWhatsappInstances(i, 'use', false);
				}
			}
			setPhoneNumbersUsed([]);
		} else {
			if (whatsapp.instances.length == 1) {
				updateWhatsappInstances(0, 'use', true);
				setPhoneNumbersUsed(['0']);
			}
		}
	};

	const handleChangeWhatsappPhoneNumbers = (event) => {
		const newValue = event.target.value;
		setPhoneNumbersUsed(newValue);
		for (let i = 0; i < whatsapp.instances.length; i++) {
			const isSelected = newValue.indexOf(i.toString()) > -1;
			if (isSelected !== whatsapp.instances[i].use) {
				updateWhatsappInstances(i, 'use', isSelected);
			}
		}
		try {
			window.parent.postMessage('change', '*');
		} catch (e) {
			// ignore
		}
		props.this.setState({ changed: true });
	};

	const RenderWhatsappUsed = () => (
		<FormControlLabel
			key="whatsappUsed"
			style={{
				paddingTop: 5,
			}}
			className="whatsappUsedClass"
			control={
				<Checkbox
					checked={whatsapp.used}
					onChange={() =>
						changeCheckboxField(whatsapp.used, !whatsapp.used, 'whatsapp.used')
					}
					color="primary"
				/>
			}
			label={i18n.t('Whatsapp Notification')}
		/>
	);

	const RenderCreateDatapoints = () => (
		<FormControlLabel
			key="createDatapoints"
			style={{
				paddingTop: 5,
			}}
			className="createDatapointsClass"
			control={
				<Checkbox
					checked={createDatapoints}
					onChange={() =>
						changeCheckboxField(
							createDatapoints,
							!createDatapoints,
							'createDatapoints',
						)
					}
					color="primary"
				/>
			}
			label={i18n.t('Create datapoints')}
		/>
	);

	const RenderWhatsappPhoneNumbers = () => (
		<Grid item xs={12} md={9}>
			<FormControl
				className="whatsappPhoneNumbers-class"
				style={{
					paddingTop: 5,
				}}
			>
				<InputLabel id="whatsappPhoneNumber-select-label">{i18n.t('Use phone number')}</InputLabel>
				<Select
					labelId="whatsappPhonenumber-label"
					id="whatsappPhoneNumber"
					multiple
					value={phoneNumbersUsed}
					onChange={handleChangeWhatsappPhoneNumbers}
					input={<OutlinedInput label={i18n.t('Use phone number')} />}
					renderValue={(selected) => {
						if (selected.length === 0) {
						  return <em>{i18n.t('selectPhoneNumber',{ count: whatsapp.instances.length })}</em>;
						}
						return selectedToString(selected);
					  }}
					MenuProps={MenuProps}
					style={{ minWidth: 300}}
				>
				<MenuItem disabled value="">
					<em>{i18n.t('Select phone number')}</em>
				</MenuItem>
					{whatsapp.instances.map((item, index) => (
						<MenuItem
							key={index.toString()}
							value={index.toString()}
							id={'whatsappPhoneNumber-select-menuitem'}
						>
							<Checkbox checked={phoneNumbersUsed.indexOf(index.toString()) > -1} />
							<ListItemText
								primary={
									item.phoneNumber + ' (' + i18n.t('Instance') + ': ' + item.instanceNumber + ')'
								}
							/>
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</Grid>
	);

	function selectedToString(selected) {
		let label = '';
		for (let i = 0; i < whatsapp.instances.length; i++) {
			const isSelected = selected.indexOf(i.toString()) > -1;
			if (isSelected) label = label + (label !== '' ? ', ' : '') + whatsapp.instances[i].phoneNumber;
		}
		return label;
	}

	function updateWhatsappInstances(index, attr, value) {
		const instanceCopy = whatsapp.instances;
		instanceCopy[index][attr] = value;
		updateNativeValue(`whatsapp.instances`, instanceCopy);
		return true;
	}

	return (
		<>
			<Grid container rowSpacing={0.5} direction="row" alignItems="baseline" spacing={1}>
				<Grid container xs={12} md={12}>
					<Grid item xs={12} md={3}>
						<RenderWhatsappUsed />
					</Grid>
					{whatsapp.used === true && whatsapp.instances.length > 1 && (
						<RenderWhatsappPhoneNumbers />
					)}
				</Grid>
				<Grid container xs={12} md={12}>
					<Grid item xs={12} md={12}>
						<RenderCreateDatapoints />
					</Grid>
				</Grid>
			</Grid>
		</>
	);
}
