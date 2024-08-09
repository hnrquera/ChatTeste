import { Component, OnInit, inject } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../components/dialog/dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [ FormsModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit{
  user: string = ''
  messageContent: string = '';
  messages: { user: string, text: string, timestamp: string }[] = []; // Inclua timestamp

  private hubConnection!: signalR.HubConnection;
  private messagesSubject = new BehaviorSubject<{ user: string, text: string, timestamp: string }[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  constructor() {
    this.openNameDialog();
  }

  openNameDialog(): void {
    const dialogRef = this.dialog.open(DialogComponent, {
      width: '250px',
      disableClose: true,
      panelClass: 'dark-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.user = result;
        this.openConnection();
      }
    });
  }

  openConnection(){
    this.hubConnection = new signalR.HubConnectionBuilder()
    .withUrl('https://localhost:7051/chatHub')
    .build();

    this.hubConnection.on('newMessage', (user, text, timestamp) => {
      const messages = this.messagesSubject.value;
      messages.push({ user, text, timestamp });
      this.messagesSubject.next(messages);
    });

    this.hubConnection.on('previousMessage', (messages: {user: string, text: string, timestamp: string}[]) => {
      this.messagesSubject.next(messages);
    });

    this.hubConnection.on('newUser', (user) => {
      const message = user == this.user ? 'Você entrou no chat!' : `${user} entrou no chat!`;
      this.snack.open(message, 'Fechar', {
        duration: 2500,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      })
    });

    this.hubConnection.start().then(() => {
      this.hubConnection.send("newUser", this.user, this.hubConnection.connectionId)
    });
  }

  ngOnInit(): void {
    this.messages$.subscribe(messages => {
      this.messages = messages;
    });
  }

  sendMessage(user: string ,message: string) {
    this.hubConnection.send('newMessage', user, message).then(() => this.messageContent = '');
  }
}
