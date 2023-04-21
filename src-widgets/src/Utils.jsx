import React from 'react';
import i18next from 'i18next';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import Input from '@mui/material/Input';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

class Utils {
    static showFontfamily(field,data,onDataChange,checkAttributes) {
        const fontCheck = new Set([
            // Windows 10
            'Arial','Arial Black','Bahnschrift','Calibri','Cambria','Cambria Math','Candara','Comic Sans MS','Consolas','Constantia','Corbel','Courier New','Ebrima','Franklin Gothic Medium','Gabriola','Gadugi','Georgia','HoloLens MDL2 Assets','Impact','Ink Free','Javanese Text','Leelawadee UI','Lucida Console','Lucida Sans Unicode','Malgun Gothic','Marlett','Microsoft Himalaya','Microsoft JhengHei','Microsoft New Tai Lue','Microsoft PhagsPa','Microsoft Sans Serif','Microsoft Tai Le','Microsoft YaHei','Microsoft Yi Baiti','MingLiU-ExtB','Mongolian Baiti','MS Gothic','MV Boli','Myanmar Text','Nirmala UI','Palatino Linotype','Segoe MDL2 Assets','Segoe Print','Segoe Script','Segoe UI','Segoe UI Historic','Segoe UI Emoji','Segoe UI Symbol','SimSun','Sitka','Sylfaen','Symbol','Tahoma','Times New Roman','Trebuchet MS','Verdana','Webdings','Wingdings','Yu Gothic',
            // macOS
            'American Typewriter','Andale Mono','Arial','Arial Black','Arial Narrow','Arial Rounded MT Bold','Arial Unicode MS','Avenir','Avenir Next','Avenir Next Condensed','Baskerville','Big Caslon','Bodoni 72','Bodoni 72 Oldstyle','Bodoni 72 Smallcaps','Bradley Hand','Brush Script MT','Chalkboard','Chalkboard SE','Chalkduster','Charter','Cochin','Comic Sans MS','Copperplate','Courier','Courier New','Didot','DIN Alternate','DIN Condensed','Futura','Geneva','Georgia','Gill Sans','Helvetica','Helvetica Neue','Herculanum','Hoefler Text','Impact','Lucida Grande','Luminari','Marker Felt','Menlo','Microsoft Sans Serif','Monaco','Noteworthy','Optima','Palatino','Papyrus','Phosphate','Rockwell','Savoye LET','SignPainter','Skia','Snell Roundhand','Tahoma','Times','Times New Roman','Trattatello','Trebuchet MS','Verdana','Zapfino',
        ].sort());
        document.fonts.ready;
        const fontAvailable = new Set();
        for (const font of fontCheck.values()) {
            try {
                let add = true;
                for (let i = 0; i < checkAttributes.length; i++) {
                    add = document.fonts.check(`${data[checkAttributes[i]]}px "${font}"`);
                    if (add === false) { break; }
                }
                if (add === true) {
                    fontAvailable.add(font);
                }
            } catch (err) {
                console.error(`Error while checking font: ${font}.`);
                console.log(err);
            }
        }
        const menuitems = [];
        for (const font of fontAvailable) {
            menuitems.push({ title: font,value: font });
        }
        return <FormControl>
            <Select
                value={data[field.name]}
                onChange={event => {
                    onDataChange({ [field.name]: event.target.value });
                }}
                input={<Input name="fontfamily" />}
                label={i18next.t('vis_2_widgets_trashmaster_fontfamily')}
                style={{ fontSize: '12.8px' }}
            >
                {menuitems.map(item => (
                    <MenuItem key={item.value} value={item.value} style={{ fontSize: '16px' }}>
                        {item.title}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>;
    }

    static showCheckbox(field,data,onDataChange) {
        return <FormControl>
            <Checkbox
                checked={data[field.name]}
                onChange={event => {
                    onDataChange({ [field.name]: event.target.checked });
                }}
                color="primary"
            />
        </FormControl>;
    }

    static showInstances(field,data,onDataChange) {
        const menuitems = (('selectinstances' in data) && data.selectinstances !== '') ? data.selectinstances.replaceAll('[','{').replaceAll(']','}').replaceAll('#','"').split('}')
            .slice(0,-1) : [];
        for (let i = 0; i < menuitems.length; i++) {
            menuitems[i] += '}';
            menuitems[i] = JSON.parse(menuitems[i].replaceAll(/'/g,'"'));
        }
        return data.selectinstances === '' ? <div></div> : <FormControl>
            <Select
                value={data[field.name]}
                onChange={event => {
                    onDataChange({ [field.name]: event.target.value });
                }}
                input={<Input name="instances" />}
                label={i18next.t('vis_2_widgets_trashmaster_instance')}
                style={{ fontSize: '12.8px' }}
            >
                {menuitems.map(item => (
                    <MenuItem key={item.value} value={item.value} style={{ fontSize: '16px' }}>
                        {item.title}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>;
    }
}

export async function arr2string(arr) {
    let str = '';
    // eslint-disable-next-line array-callback-return
    arr.map(arrelement => {
        str += '[';
        Object.keys(arrelement)
            .forEach((attr,index) => {
                if (index > 0) str += ',';
                str += `#${attr}#: #${arrelement[attr].toString()}#`;
            });
        str += ']';
    });
    return str;
}

export function changeData(newData) {
    const { id,view,views,selectedWidgets } = this.props;
    const changeWidgets = selectedWidgets !== null ? selectedWidgets : [id];
    changeWidgets.forEach(widgetId => {
        Object.keys(newData)
            .forEach(attr => {
                views[view].widgets[widgetId].data[attr] = newData[attr];
                this.state.data[attr] = newData[attr];
                this.state.rxData[attr] = newData[attr];
            });
    });
}

export async function getInstances() {
    const instance = await this.props.socket.getObjectViewSystem('instance','system.adapter.trashmaster.','system.adapter.trashmaster.\u9999')
        .then(rows => {
            const newinstances = [];
            Object.keys(rows).forEach((key,i) => {
                if (rows[key].native.key !== '') {
                    let url;
                    try {
                        url = new URL(rows[key].native.url).hostname.replace('www.','');
                        newinstances.push({ value: i,title: `${url} (${rows[key]._id.replace('system.adapter.trashmaster.','')})` });
                    } catch {
                        url = '';
                    }
                }
            });
            return newinstances;
        })
        .then(async newinstances => {
            if (this.state.editMode === true) {
                await this.arr2string(newinstances)
                    .then(strinstances => {
                        this.changeData({ selectinstances: strinstances });
                    });
                this.changeData({ instancenamehidden: newinstances.length < 2 ? 'true' : 'false' });
            }
            let ret = this.state.data.instancename;
            if (this.initial === true && (!('instancename' in this.state.data) || this.state.data.instancename === '')) {
                ret = newinstances.length > 0  ? newinstances[0].value : '';
                this.changeData({ instancename: ret });
            }
            this.instancenameLocal = ret;
            return ret;
        })
        .catch(error => {
            console.log('ERROR !!!:');
            console.log(error);
            return '';
        });
    return instance;
}

export default Utils;
