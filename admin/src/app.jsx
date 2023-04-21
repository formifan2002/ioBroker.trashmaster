import React, { useState } from 'react';
import GenericApp from '@iobroker/adapter-react-v5/GenericApp';
import ErrorDialog from '@iobroker/adapter-react-v5/Dialogs/Error';
import SaveCloseButtons from '@iobroker/adapter-react-v5/Components/SaveCloseButtons';
import I18n from '@iobroker/adapter-react-v5/i18n';
import { withStyles } from '@mui/styles';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import Settings from './components/settings';
import SettingsDetails from './components/settingsDetails';

const styles = (_theme) => ({
	root: {},
});

class App extends GenericApp {
	constructor(props) {
		const extendedProps = {
			...props,
			encryptedFields: [],
			translations: {
				en: require('./i18n/en.json'),
				de: require('./i18n/de.json'),
				ru: require('./i18n/ru.json'),
				pt: require('./i18n/pt.json'),
				nl: require('./i18n/nl.json'),
				fr: require('./i18n/fr.json'),
				it: require('./i18n/it.json'),
				es: require('./i18n/es.json'),
				pl: require('./i18n/pl.json'),
				'zh-cn': require('./i18n/zh-cn.json'),
			},
			sentryDSN: window.sentryDSN,
		};
		super(props, extendedProps);
	}

	onConnectionReady() {
		// executed when connection is ready
	}

	render() {
		if (!this.state.loaded) {
			return super.render();
		}
		return (
			<div className="App" style={{ marginLeft: 5 }}>
				<AppContainer
					this={this}
					GenericApp={GenericApp}
					updateNativeValue={this.updateNativeValue.bind(this)}
					sendMessage={(command, message) => {
						const to = `${this.adapterName}.${this.instance}`;
						return this.socket.sendTo(to, command, message);
					}}
				/>

				{this.renderError()}
				{this.renderToast()}
			</div>
		);
	}
}

export default withStyles(styles)(App);

function AppContainer(props) {
	const [tab, setTab] = useState('1');
	const [tabChange, setTabChange] = useState(false);

	function handleChangeTab(event, newValue) {
		if (tab != newValue) {
			setTab(newValue);
			setTabChange(true);
		}
	}

	async function save(isClose) {
		const {whatsapp,wasteCalendar} = props.this.state.native;
		if (whatsapp.used) {
			let lError = true;
			for (let i = 0; i < whatsapp.instances.length && lError; i++) {
				if (whatsapp.instances[i].use) {
					lError = false;
				}
			}
			if (lError) {
				props.this.setState({ errorDialog: true });
				return false;
			}
		}
		props.this.onSave(isClose);
	}

	function close() {
		props.GenericApp.onClose();
	}

	const RenderSaveCloseButtons = () => (
		<SaveCloseButtons
			theme={props.this.state.theme}
			newReact={props.this.newReact}
			dense="false"
			noTextOnButtons={
				props.this.state.width === 'xs' || props.this.state.width === 'sm' || props.this.state.width === 'md'
			}
			changed={props.this.state.changed}
			onSave={(isClose) => save(isClose)}
			onClose={() => close()}
		/>
	);

	const SaveError = () => (
		<ErrorDialog
			title={I18n.t('Error while saving')}
			text={I18n.t('No telephone number selected')}
			onClose={() => props.this.setState({ errorDialog: false })}
		/>
	);

	return (
		<Box sx={{ width: '100%', typography: 'body1', flexDirection: 'column' }}>
			{props.this.state.errorDialog && <SaveError />}
			<TabContext value={tab}>
				<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
					<TabList onChange={handleChangeTab} aria-label="aria-label">
						<Tab label={I18n.t('General')} value="1" />
						{props.this.state.native.key != '' && <Tab label={I18n.t('Details')} value="2" />}
					</TabList>
				</Box>
				<TabPanel value="1">
					<Settings
						native={props.this.state.native}
						state={props.this.state}
						thisis={props.this}
						updateNativeValue={props.updateNativeValue}
						sendMessage={props.sendMessage}
						tabChange={tabChange}
						setTabChange={setTabChange}
					/>
				</TabPanel>
				<TabPanel value="2">
					<SettingsDetails
						props={props}
						this={props.this}
					/>
				</TabPanel>
			</TabContext>
			{props.this.state.bottomButtons && <RenderSaveCloseButtons />}
		</Box>
	);
}
