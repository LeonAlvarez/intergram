import * as store from 'store'
import io from 'socket.io-client'

import { h, Component } from 'preact';
import MessageArea from './message-area';

export default class Chat extends Component {

    autoResponseState = 'pristine'; // pristine, set or canceled
    autoResponseTimer = 0;

    constructor(props) {
        super(props);
        if (store.enabled) {
            this.messagesKey = 'messages' + '.' + props.chatId + '.' + props.host;
            this.state.visitorName = store.get('visitorName') || store.set('visitorName', null);
            this.state.messages = store.get(this.messagesKey) || store.set(this.messagesKey, []);
        } else {
            this.state.messages = [];
            this.state.visitorName = null;
        }
        console.log(this.state.visitorName);
    }

    componentDidMount() {
        this.socket = io.connect();
        this.socket.on('connect', () => {
            this.socket.emit('register', {chatId: this.props.chatId, userId: this.props.userId });
        });
        this.socket.on(this.props.chatId, this.incomingMessage);
        this.socket.on(this.props.chatId+'-'+this.props.userId, this.incomingMessage);

        if (!this.state.messages.length) {
            this.writeToMessages({text: this.props.conf.introMessage, from: 'admin'});
            if (this.state.visitorName) {
                this.writeToMessages({ text: `Bienvenido ${this.state.visitorName}`, from: 'admin' });
            }
                
        }
    }
    handleUserFromKeyPress = (e) => {
        if (e.keyCode == 13 && this.input.value) {
            let visitorName = this.input.value;
            this.input.value = '';
            store.set('visitorName', visitorName);
            this.setState({ visitorName });
            this.writeToMessages({ text: `Bienvenido ${visitorName}`, from: 'admin' });
        }
    };
    renderUserFrom() {
        return (
            <div>
                <ol class="chat">
                    <li class="admin">
                        <div class="msg">
                            <p>Bienvenido, para poder ayudarte necesito tu nombre y apellido</p>
                        </div>
                    </li>
                </ol>
               
                <input class="textarea" type="text" placeholder="Escribe tu nombre y apellidos"
                    ref={(input) => { this.input = input }}
                    onKeyPress={this.handleUserFromKeyPress}/>
            </div>
        );
    }
    renderChat() {
        const state = this.state;
        return (
            <div>
                <MessageArea messages={state.messages} conf={this.props.conf} />

                <input class="textarea" type="text" placeholder={this.props.conf.placeholderText}
                    ref={(input) => { this.input = input }}
                    onKeyPress={this.handleKeyPress} />

                <a class="banner" href="https://github.com/idoco/intergram" target="_blank">
                    Powered by <b>Intergram</b>&nbsp;
                </a>
            </div>
        );
    }
    render({},state) {
        if (state.visitorName) {
            return this.renderChat();
        }
        return this.renderUserFrom();
    }

    handleKeyPress = (e) => {
        if (e.keyCode == 13 && this.input.value) {
            let text = this.input.value;
            this.socket.send({text, from: 'visitor', visitorName: this.state.visitorName});
            this.input.value = '';

            if (this.autoResponseState === 'pristine') {

                setTimeout(() => {
                    this.writeToMessages({
                        text: this.props.conf.autoResponse,
                        from: 'admin'});
                }, 500);

                this.autoResponseTimer = setTimeout(() => {
                    this.writeToMessages({
                        text: this.props.conf.autoNoResponse,
                        from: 'admin'});
                    this.autoResponseState = 'canceled';
                }, 60 * 1000);
                this.autoResponseState = 'set';
            }
        }
    };

    incomingMessage = (msg) => {
        this.writeToMessages(msg);
        if (msg.from === 'admin') {
            document.getElementById('messageSound').play();

            if (this.autoResponseState === 'pristine') {
                this.autoResponseState = 'canceled';
            } else if (this.autoResponseState === 'set') {
                this.autoResponseState = 'canceled';
                clearTimeout(this.autoResponseTimer);
            }
        }
    };

    writeToMessages = (msg) => {
        msg.time = new Date();
        this.setState({
            message: this.state.messages.push(msg)
        });

        if (store.enabled) {
            try {
                store.transact(this.messagesKey, function (messages) {
                    messages.push(msg);
                });
            } catch (e) {
                console.log('failed to add new message to local storage', e);
                store.set(this.messagesKey, [])
            }
        }
    }
}
