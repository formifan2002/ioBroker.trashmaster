import React from 'react';
import i18next from 'i18next';
import { i18n as I18n } from '@iobroker/adapter-react-v5';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { withStyles,withTheme } from '@mui/styles';
import { VisRxWidget } from '@iobroker/vis-2-widgets-react-dev';
import translations from './translations-i18next';
import Utils,{ arr2string,changeData,getInstances } from './Utils';

const styles = () => ({
    root: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden',
    },
});

class TrashTable extends (window.visRxWidget || VisRxWidget) {
    constructor(props) {
        super(props);
        this.arr2string = arr2string.bind(this);
        this.changeData = changeData.bind(this);
        this.getInstances = getInstances.bind(this);
        this.initial = true;
        this.instancenameLocal = this.state.data.instancename;
        this.dayformatLocal = this.state.data.dayformat;
        this.oidChange = false;
        this.wasteCalendar = [];
        this.refTable = React.createRef();
        this.refTableBody = React.createRef();
        this.refTableHeader = React.createRef();
    }

    static getWidgetInfo() {
        // more details for custom filters in file:
        // vis-2-beta/static/js/Attributes/Widget/WidgetField.jsx (line 424ff)
        //
        // new fields are not added to existing widgets !!!
        return {
            id: 'tplTrashTable',
            visSet: 'trashmaster',
            visName: I18n.t('vis_2_widgets_trashmaster_widgetname_table'), // Name of widget
            visAttrs: [
                {
                    name: 'common', // group name
                    label: 'vis_2_widgets_trashmaster_common', // translated group label
                    fields: [
                        {
                            name: 'instancename',
                            label: 'vis_2_widgets_trashmaster_instance',
                            type: 'custom',
                            hidden: 'data.instancenamehidden === "true"',
                            component: (
                                field,
                                data,
                                onDataChange,
                            ) => Utils.showInstances(field,data,onDataChange),
                        },
                        {
                            name: 'instancenamehidden',  // hide instance selection if only one instance exists
                            type: 'text',
                            hidden: true,
                            default: 'false',
                        },
                        {
                            name: 'selectinstances',     // hidden value of the select entries for instances
                            label: 'selectinstances',
                            type: 'text',
                            hidden: true,
                            default: '',
                        },
                        {
                            name: 'dayformat',
                            default: 'short',
                            label: 'vis_2_widgets_trashmaster_dayformat',
                            type: 'select',
                            options: [
                                {
                                    value: 'short',
                                    label: 'vis_2_widgets_trashmaster_dateformat_short',
                                },
                                {
                                    value: 'long',
                                    label: 'vis_2_widgets_trashmaster_dateformat_long',
                                },
                            ],
                        },
                        {
                            name: 'fontfamily',
                            label: 'vis_2_widgets_trashmaster_fontfamily',
                            default: 'Arial',
                            type: 'custom',
                            hidden: 'data.showdate === false && data.showdays === false',
                            component: (
                                field,
                                data,
                                onDataChange,
                            ) => Utils.showFontfamily(field,data,onDataChange,['fontsizeheader','fontsizebody','fontsizemonth']),
                        },
                        {
                            name: 'showheader',
                            default: true,
                            label: 'vis_2_widgets_trashmaster_showheader',
                            type: 'custom',
                            component: (
                                field,
                                data,
                                onDataChange,
                            ) => Utils.showCheckbox(field,data,onDataChange),
                        },
                        {
                            name: 'fontsizeheader',
                            default: 12,
                            label: 'vis_2_widgets_trashmaster_fontsize_header',
                            type: 'slider',
                            hidden: 'data.showheader === false',
                            min: 6,
                            max: 24,
                            step: 1,
                        },
                        {
                            name: 'fontsizemonth',
                            default: 10,
                            label: 'vis_2_widgets_trashmaster_fontsize_month',
                            type: 'slider',
                            min: 6,
                            max: 24,
                            step: 1,
                        },
                        {
                            name: 'fontsizebody',
                            default: 10,
                            label: 'vis_2_widgets_trashmaster_fontsize_body',
                            type: 'slider',
                            min: 6,
                            max: 24,
                            step: 1,
                        },
                        {
                            name: 'oid',     // name in data structure
                            label: 'vis_2_widgets_trashmaster_oid',
                            type: 'id',
                            noInit: true,
                            hidden: true,
                        },
                    ],
                },
                // check here all possible types https://github.com/ioBroker/ioBroker.vis/blob/react/src/src/Attributes/Widget/SCHEMA.md
            ],
            visPrev: 'widgets/trashmaster/img/table.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    async propertiesUpdate() {
        // Widget has 3 important states
        // 1. this.state.values - contains all state values, that are used in widget (automatically collected from widget info).
        //                        So you can use `this.state.values[this.state.rxData.oid + '.val']` to get value of state with id this.state.rxData.oid
        // 2. this.state.rxData - contains all widget data with replaced bindings. E.g. if this.state.data.type is `{system.adapter.admin.0.alive}`,
        //                        then this.state.rxData.type will have state value of `system.adapter.admin.0.alive`
        // 3. this.state.rxStyle - contains all widget styles with replaced bindings. E.g. if this.state.styles.width is `{javascript.0.width}px`,
        //                        then this.state.rxData.type will have state value of `javascript.0.width` + 'px
        if (this.initial === true && this.oidChange !== true) {
            return;
        }
        const { dayformat,instancename } = this.state.data;
        if ((typeof instancename !== 'undefined' && this.instancenameLocal !== instancename) || this.oidChange === true || this.dayformatLocal !== dayformat) {
            this.instancenameLocal = instancename;
            this.dayformatLocal = dayformat;
            await this.getWasteCalendar(instancename);
            if (this.oidChange === true) { this.oidChange = false; }
        }
    }

    componentDidMount() {
        super.componentDidMount();
        // Update data
        i18next.init(translations)
            .then(() => {
                i18next.changeLanguage(this.props.systemConfig.common.language);
            });
        this.getInstances()
            .then(instance => {
                this.getWasteCalendar(instance)
                    .then(() => {
                        this.changeTableSize()
                            .then(() => {
                                this.initial = false;
                            });
                    });
            });
    }

    // Do not delete this method. It is used by vis to read the widget configuration.
    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo() {
        return TrashTable.getWidgetInfo();
    }

    // This function is called every time when rxData is changed
    onRxDataChanged() {
        this.propertiesUpdate();
    }

    // This function is called every time when rxStyle is changed
    // eslint-disable-next-line class-methods-use-this
    onRxStyleChanged() {
        this.changeTableSize();
    }

    async changeTableSize() {
        const height = this.refService.current.clientHeight;
        if (height !== 0) {
            const headerHeight = this.state.data.showheader === false ? 0 : parseInt(this.refTableHeader.current.offsetHeight);
            const newTableHeight = `${(height - 2).toString()}px`;
            const newHeight = `${(height - headerHeight - 10).toString()}px`;
            this.refTable.current.style.height = newTableHeight;
            this.refTableBody.current.style.height = newHeight;
        }
        const width = this.refService.current.clientWidth;
        if (width !== 0) {
            const newWidth = `${(width - 2).toString()}px`;
            this.refTable.current.style.width = newWidth;
            this.refTableBody.current.style.width = newWidth;
            this.refTableHeader.current.style.width = newWidth;
        }
    }

    // This function is called every time when some Object State updated, but all changes lands into this.state.values too
    // eslint-disable-next-line class-methods-use-this, no-unused-vars
    onStateUpdated(id,state) {
        // state of the object 'WasteCalendar' has changed
        this.oidChange = true;
        this.propertiesUpdate();
    }

    async getCalendarObject(instance) {
        const id = `trashmaster.${instance}.WasteCalendar`;
        const calendar = await this.props.socket.getForeignStates(id)
            .then(status => {
                if (!(id in status) || typeof status[id].val === 'undefined') { return {}; }
                this.changeData({ oid: id });
                return JSON.parse(status[id].val);
            });
        return calendar;
    }

    async getWasteCalendar(instance) {
        let monatsName = '';
        let tag = '';
        this.wasteCalendar = [];
        const tempWasteCalendar = [];
        const calendarObject = await this.getCalendarObject(instance);
        if (typeof calendarObject === 'undefined' || Object.entries(calendarObject).length === 0) return;
        // eslint-disable-next-line array-callback-return
        Object.entries(calendarObject).map(calendarEntry => {
            if (monatsName !== calendarEntry[1].Monatsname) {
                tempWasteCalendar.push({
                    col1span: 3,
                    col2span: 0,
                    col3span: 0,
                    col1: `${calendarEntry[1].Monatsname} ${calendarEntry[1].Jahr}`,
                    col2: '',
                    col3: '',
                });
                monatsName = calendarEntry[1].Monatsname;
            }
            if (tag !== calendarEntry[1].Abfuhrdatum) {
                tempWasteCalendar.push({
                    col1span: 1,
                    col2span: 1,
                    col3span: 1,
                    col1: `${this.state.data.dayformat === 'short' ? `${calendarEntry[1].AbfuhrTagKurz}.` : calendarEntry[1].AbfuhrTagLang}`,
                    col2: `${calendarEntry[1].Tag}.`,
                    col3: calendarEntry[1].Abfuhrart,
                });
                tag = calendarEntry[1].Abfuhrdatum;
            } else {
                tempWasteCalendar.push({
                    col1span: 2,
                    col2span: 0,
                    col3span: 1,
                    col1: '',
                    col2: '',
                    col3: calendarEntry[1].Abfuhrart,
                });
            }
        });
        this.wasteCalendar = [...tempWasteCalendar];
    }

    renderWidgetBody(props) {
        super.renderWidgetBody(props);
        return <div ref={this.refTable} style={{ overflow: 'auto' }}>
            {this.state.data.showheader === true && <Table>
                <TableHead ref={this.refTableHeader}>
                    <TableRow>
                        <TableCell sx={{ fontSize: this.state.data.fontsizeheader,fontFamily: this.state.data.fontfamily  }} colSpan={3} align="left">
                            <b>{i18next.t('vis_2_widgets_trashmaster_widgetname_table')}</b>
                        </TableCell>
                    </TableRow>
                </TableHead>
            </Table>}
            <div ref={this.refTableBody} style={{ overflow: 'auto',height: '200px',width: '100%' }}>
                <Table size="small">
                    <TableBody>
                        {this.wasteCalendar.map((item,index) => (
                            <TableRow key={index}>
                                {item.col1span > 0 && (
                                    <TableCell sx={{ fontSize: item.col1span === 3 ? this.state.data.fontsizemonth : this.state.data.fontsizebody,fontFamily: this.state.data.fontfamily }} colSpan={item.col1span} align="left">
                                        {item.col1}
                                    </TableCell>
                                )}
                                {item.col2span > 0 && (
                                    <TableCell sx={{ fontSize: this.state.data.fontsizebody,fontFamily: this.state.data.fontfamily }} colSpan={item.col2span} align="left">
                                        {item.col2}
                                    </TableCell>
                                )}
                                {item.col3span > 0 && (
                                    <TableCell sx={{ fontSize: this.state.data.fontsizebody,fontFamily: this.state.data.fontfamily }} colSpan={item.col3span} align="left">
                                        {item.col3}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>;
    }
}
export default withStyles(styles)(withTheme(TrashTable));
