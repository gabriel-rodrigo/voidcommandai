# Void Command AI - Mobile App Design

## Overview
Jogo tático espacial futurista por turnos, refatorado do web para mobile Android. O jogador comanda uma frota de 3 naves em batalhas contra IA com diferentes níveis de dificuldade. O jogo usa um sistema de programação de ações (mover + atirar) seguido de execução em tempo real.

## Screen List

### 1. Main Menu Screen
- Tela inicial do jogo com logo "VOID COMMAND" e subtítulo
- Botões: "Single Player", "Settings", "Stats"
- Exibição do nome do jogador (guest por padrão)
- Banner de ad na parte inferior

### 2. Difficulty Select Screen
- Seleção de dificuldade: Easy, Normal, Hard
- Descrição de cada dificuldade
- Botão voltar para o menu

### 3. Shipyard Screen (Fleet Selection)
- Grid de 5 tipos de naves disponíveis (Wall, Needle, Vanguard, Sentinel, Stinger)
- Card de cada nave com stats (HP, Speed, Defense, Damage, Range, Move Distance)
- Slots de seleção (3 naves)
- Botão "Confirm Fleet" habilitado quando 3 naves selecionadas
- Banner de ad na parte inferior

### 4. Battle Screen
- Canvas de batalha (proporção 3:4 vertical) ocupando a maior parte da tela
- Campo de batalha com grid, estrelas de fundo, naves, balas e partículas
- HUD superior: turno atual, fase (Programming/Executing), timer
- HUD inferior: botão "Execute Actions" / status de espera
- Interação por toque: tap para selecionar nave, tap para mover, tap para atirar
- Indicadores visuais de ações pendentes (linhas tracejadas)
- Popups de dano flutuantes
- Interstitial ad entre partidas

### 5. Results Screen (Game Over)
- Resultado: Victory / Defeat / Draw
- Stats de ambos jogadores (Damage, Block, Accuracy, Ships Lost)
- Botões: "Return to Menu", "Play Again"
- Banner de ad

### 6. Settings Screen
- Volume da música (slider)
- Volume dos efeitos sonoros (slider)
- Toggle mudo
- Sobre o jogo

### 7. Stats Screen
- Total de jogos, vitórias, dano causado, naves destruídas
- Histórico de partidas recentes

## Primary Content and Functionality

### Battle System
- **Programming Phase**: Jogador seleciona nave → toca para definir destino de movimento → toca para definir alvo de tiro
- **Execution Phase**: Naves se movem e atiram simultaneamente em tempo real
- **Turnos**: Máximo de 50 turnos por partida
- **Timer**: 30s para programar ações, 3s para execução

### Ship Types
| Ship | HP | Speed | Defense | Damage | Range | Move Dist | Role |
|------|-----|-------|---------|--------|-------|-----------|------|
| Wall | 200 | 50 | 20 | 28 | 260 | 100 | Tank |
| Needle | 60 | 170 | 4 | 32 | 300 | 300 | Speed |
| Vanguard | 120 | 110 | 12 | 24 | 340 | 200 | Versatile |
| Sentinel | 100 | 80 | 8 | 36 | 500 | 150 | Sniper |
| Stinger | 80 | 140 | 6 | 40 | 220 | 250 | Glass Cannon |

### Powerup Shop
- Shield Upgrade: +15 Defense (50 credits)
- Engine Upgrade: +80 Move Distance (50 credits)
- Weapon Upgrade: +15 Damage (75 credits)

## Key User Flows

### Flow 1: Start Single Player Game
1. Main Menu → Tap "Single Player"
2. Difficulty Select → Choose difficulty
3. Shipyard → Select 3 ships → Tap "Confirm Fleet"
4. Battle Screen → Programming phase begins

### Flow 2: Battle Turn
1. Tap own ship to select (glow effect)
2. Tap battlefield to set move target (dashed line preview)
3. Tap battlefield to set fire target (red line preview)
4. Repeat for other ships
5. Tap "Execute Actions" when ready
6. Watch execution phase (ships move, bullets fly, damage popups)
7. Next turn begins

### Flow 3: Game Over
1. All enemy ships destroyed OR max turns reached
2. Results overlay appears with stats
3. Tap "Return to Menu" or "Play Again"
4. Interstitial ad may show

## Color Choices

### Primary Palette
- **Background**: `#050505` (quase preto, espacial)
- **Surface**: `#111111` (cards e painéis)
- **Border**: `#222222` (bordas sutis)
- **Foreground**: `#FFFFFF` (texto principal)
- **Muted**: `#666666` (texto secundário)
- **Primary/Accent**: `#EF4444` (vermelho - tema de combate)
- **Player 1 Color**: `#EF4444` (vermelho)
- **Player 2 / AI Color**: `#3B82F6` (azul)
- **Success**: `#22C55E` (verde - vitória)
- **Warning**: `#EAB308` (amarelo - créditos/shop)
- **Error**: `#EF4444` (vermelho - derrota)
- **Critical Hit**: `#F59E0B` (laranja)

### Typography
- Títulos: Bold, uppercase, tracking-wide
- Corpo: Regular, text-sm
- HUD: Monospace-style, bold
- Estilo militar/futurista consistente

## Architecture (Mobile)

### Camadas
1. **Domain Layer** (`lib/game/`): Engine, tipos, constantes - lógica pura sem dependências de UI
2. **Service Layer** (`lib/services/`): Audio, Storage, Ads - abstrações de serviços nativos
3. **State Layer** (`lib/stores/`): Estado do jogo, settings - gerenciamento com Context/useReducer
4. **UI Layer** (`app/`, `components/`): Telas e componentes visuais

### Renderização do Campo de Batalha
- Usar `react-native-svg` para renderizar o campo de batalha (naves, balas, grid, partículas)
- Animações com `react-native-reanimated`
- Touch handling nativo para interação

### Integração de Ads
- `react-native-google-mobile-ads` para AdMob
- Banner ads: Menu, Shipyard, Results
- Interstitial ads: Entre partidas
- Preparado para rewarded ads (assistir ad para ganhar créditos)
