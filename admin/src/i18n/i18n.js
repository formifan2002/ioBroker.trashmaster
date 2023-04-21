import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
	// pass the i18n instance to react-i18next.
	.use(initReactI18next)
	// init i18next
	// for all options read: https://www.i18next.com/overview/configuration-options
	.init({
		lng: 'de',
		fallbackLng: 'en',
		debug: true,
		resources: {
			de: {
				translation: require('./de.json'),
			},
			en: {
				translation: require('./en.json'),
			},
			es: {
				translation: require('./es.json'),
			},
			fr: {
				translation: require('./fr.json'),
			},
			it: {
				translation: require('./it.json'),
			},
			nl: {
				translation: require('./nl.json'),
			},
			pl: {
				translation: require('./pl.json'),
			},
			pt: {
				translation: require('./pt.json'),
			},
			ru: {
				translation: require('./ru.json'),
			},
			uk: {
				translation: require('./uk.json'),
			},
			'zh-cn': {
				translation: require('./zh-cn.json'),
			},
		},
	});
export default i18n;
