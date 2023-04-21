import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import ArrowCircleDownTwoToneIcon from '@mui/icons-material/ArrowCircleDownTwoTone';
import ArrowCircleUpTwoToneIcon from '@mui/icons-material/ArrowCircleUpTwoTone';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function EditColumn(props) {
	const { i18n, valueWastetype, fieldtext, handleClose, open } = props;
	const [value, setValue] = useState(valueWastetype);
	const [showMinusButton, setShowMinusButton] = useState(value >= 0);

	const handleChange = (newValue) => {
		const regexp = /^0$|^-?[1-9]\d*(\.\d+)?$/;
		const deactivated = i18n.t('deactivated');
		if (newValue === deactivated) {
			newValue = '';
		}
		if (newValue.substr(0, deactivated.length) === deactivated) {
			newValue = newValue.substring(11);
			if (newValue === '+') {
				newValue = '0';
			}
		}
		if (newValue.slice(-1) === '+') {
			newValue = (parseInt(newValue.substr(0, newValue.length - 1)) + 1).toString();
		}
		if (newValue.slice(-1) === '-') {
			const change = parseInt(newValue.substr(0, newValue.length - 1)) - 1;
			if (change >= -1) {
				newValue = change.toString();
			}
		}
		console.log(newValue);
		console.log(regexp.test(parseInt(newValue)));
		if ((regexp.test(parseInt(newValue)) && parseInt(newValue) >= -1) || newValue === '') {
			setValue(newValue === '' ? -1 : parseInt(newValue));
			setShowMinusButton(newValue >= 0);
		}
	};

	const handleSave = () => {
		handleClose(value);
		return;
	};

	const handlePlus = (add) => {
		//apiRef.current.stopCellEditMode({id: id, field: field});
		const newValue = value + (add === true ? 1 : -1);
		if (newValue >= -1) {
			setValue(newValue);
			setShowMinusButton(newValue >= 0);
		}
		return;
	};

	const handleCancel = () => {
		handleClose();
	};

	return (
		<div>
			<Dialog open={open} onClose={handleSave}>
				<DialogTitle>
					{i18n.t('Change')} {fieldtext}
				</DialogTitle>
				<DialogContent>
					<DialogContentText>{i18n.t('pressButtons', { count: value >= 0 ? 0 : 1 })}</DialogContentText>
					<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
						<Grid item xs={8} md={6}>
							<TextField
								autoFocus
								id="columninput"
								hidden="true"
								variant="standard"
								label={parseInt(value) == -1 ? '' : i18n.t('dayCollection', { count: parseInt(value) })}
								onChange={(event) => handleChange(event.target.value.toString())}
								value={value == '-1' ? i18n.t('deactivated') : value}
							/>
						</Grid>
						<Grid item xs={4} md={6}>
							<Button startIcon={<ArrowCircleUpTwoToneIcon />} onClick={() => handlePlus(true)} />
							{showMinusButton && (
								<Button startIcon={<ArrowCircleDownTwoToneIcon />} onClick={() => handlePlus(false)} />
							)}
						</Grid>
					</Box>
				</DialogContent>
				<DialogActions>
					<Grid>
						<Button onClick={handleCancel}>{i18n.t('Cancel')}</Button>
					</Grid>
					<Grid>
						<Button onClick={handleSave}>{i18n.t('Save')}</Button>
					</Grid>
				</DialogActions>
			</Dialog>
		</div>
	);
}
