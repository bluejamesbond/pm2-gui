var AppActions = Reflux.createActions([
    'systemInfoUpdated'
]);

var SystemInfoStore = Reflux.createStore({
    listenables: [AppActions],
    stats: {},
    init: function () {
        io('/sys').on('system_stat', this._setStat);
    },
    _setStat: function (stats) {
        if (!_.isEqual(this.stats, stats)) {

            stats.date = moment(Date.now()).format('YYYY-MM-DD-SS');

            if (Array.isArray(stats.cpus) && stats.cpus.length) {
                stats.cpus = stats.cpus[0].model;
            }

            if (stats.cpu) {
                stats['cpu usage'] = stats.cpu + '%';
                delete stats.cpu;
            }

            if (typeof stats.memory === 'object') {
                stats['free memory'] = (stats.memory.free / 1024 / 1024).toFixed(2) + ' MB';
                stats['memory usage'] = stats.memory.percentage + '%';
                stats['total memory'] = (stats.memory.total / 1024 / 1024).toFixed(2) + ' MB';
                delete stats.memory;
            }

            this.stats = stats;

            AppActions.systemInfoUpdated(stats);
        }
    },
    getStats: function () {
        return this.stats;
    }
});

var SystemInfoItem = React.createClass({
    getInitialState: function () {
        return {};
    },
    shouldComponentUpdate: function (nextProps) {
        return this.props.value !== nextProps.value || this.props._key !== nextProps._key;
    },
    componentDidUpdate: function () {
        this._triggerHighlight();
    },
    componentDidMount: function () {
        this._triggerHighlight();
    },
    _triggerHighlight: function () {
        var $valueText = $(React.findDOMNode(this.refs.valueText));

        $valueText.addClass('yellow');

        clearTimeout(this.colorTid);
        this.colorTid = setTimeout(function () {
            $valueText.removeClass('yellow');
        }, 800);
    },
    render: function () {
        return (
            <tr>
                <td className='key'>
                    <div className="h3 text gray left b uppercase spacing ellipses">{this.props._key}</div>
                </td>
                <td className='value'>
                    <div ref='valueText' className="h1 text gray left ellipses yellow">{this.props.value}</div>
                </td>
            </tr>
        )
    }
});

var SystemInfo = React.createClass({
    mixins: [Reflux.listenTo(AppActions.systemInfoUpdated, 'onSystemInfoUpdated')],
    getInitialState: function () {
        return {stats: {}};
    },
    onSystemInfoUpdated: function (stats) {
        this.setState({stats: stats});
    },
    render: function () {

        return (
            <div className='full'>
                <table>
                    <thead>
                    <tr>
                        <th>Property</th>
                        <th>Value</th>
                    </tr>
                    </thead>
                    <tbody>{_.map(this.state.stats, function (value, key) {
                        if (key === 'date') return;
                        return <SystemInfoItem key={key} value={value} _key={key}/>
                    })}</tbody>
                </table>
            </div>
        )
    }
});

var GraphContainer = React.createClass({
    mixins: [Reflux.listenTo(AppActions.systemInfoUpdated, 'onSystemInfoUpdated')],
    onSystemInfoUpdated: function (stats) {
        this.lyne.dataQueue(Number(stats[this.props.metric].replace('%', '')));
    },
    shouldComponentUpdate: function () {
        return false;
    },
    componentDidMount: function () {
        this.lyne = new Lyne.Graph([0,0,0,0,0,0,0 ], React.findDOMNode(this.refs.graph), _.extend({}, Lyne.Themes.Dark, {
            yAxisLabelFontFamily: "Open Sans, sans-serif",
            xAxisLabelFontFamily: "Open Sans, sans-serif",
            plotAreaStrokeColorStart : this.props.color,
            plotAreaStrokeColorStop : this.props.color,
            plotAreaFillColorStart : '#111',
            plotAreaFillColorStop : this.props.bgColor,
            xAxisLabelFontSize : "14px",
            yAxisLabelFontSize : "14px",
            plotPointFillStyle: this.props.color,
            plotPointStrokeStyle : '#111',
            plotPointLineWidth: 4

        }));
    },
    render: function () {
        return (
            <canvas className="full-abs" ref='graph'></canvas>
        )
    }
});

var App = React.createClass({
    getInitialState: function () {
        return {};
    },
    render: function () {
        return (
            <div className='full flex'>
                <div className='box'>
                    <div className='full flex vertical'>
                        <div className="full">
                            <GraphContainer metric='memory usage' color="#02A0F1" bgColor="rgba(2, 160, 241, 0.5)"/>
                        </div>
                        <div className="full" style={{borderTop:'1px solid rgba(255,255,255,0.2)'}}>
                            <GraphContainer metric='cpu usage' color="#11EA00" bgColor="rgba(17, 234, 0, 0.5)"/>
                        </div>
                    </div>
                </div>
                <div className='box sys-info' style={{borderLeft:'1px solid rgba(255,255,255,0.1)',background:'#111'}}>
                    <SystemInfo />
                </div>
            </div>
        );
    }
});

React.render(
    <App />,
    document.getElementById('body')
);

