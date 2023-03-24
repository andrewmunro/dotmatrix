import gsap from 'gsap';
import { Container, Renderer, Text } from 'pixi.js-legacy';
import { createText } from '../utils';

const MaxStringLength = 9;

type Train = {
	scheduled: {
		time: string;
		date: Date;
	};
	arrives: {
		time: string;
		date: Date;
	};
	origin: string;
	destination: string;
	platform: string;
	displayAs: 'CALL' | 'PASS' | 'ORIGIN' | 'DESTINATION' | 'STARTS' | 'TERMINATES' | 'CANCELLED_CALL' | 'CANCELLED_PASS';
};

const formatTrainRow = (train: Train) => {
	const row = new Container();

    if (train.destination.length > MaxStringLength) {
        train.destination = `${train.destination.slice(0, MaxStringLength)} . . .`
    }

    const scheduled = createText(train.scheduled.time, 'orange');
    const platform = createText(train.platform, 'yellow');
    platform.x = scheduled.x + 25;
    const dest = createText(train.destination, 'orange');
    dest.x = platform.x + 10;
    const arriving = train.arrives.date > train.scheduled.date ? createText(`Exp ${train.arrives.time}`, 'red') : createText(`On time`, 'green')
    arriving.x = train.arrives.date > train.scheduled.date ? 89 : 89;

	row.addChild(scheduled);
    row.addChild(platform);
    row.addChild(dest);
    row.addChild(arriving);

	return row;
};

const fetchTrains = async () => {
	const res = await fetch('/api/train/HDY');
	const data = await res.json();

    const trains = new Container();
    trains.y = 2;

    for (const [i, train] of data.slice(0, 3).entries()) {
        const trainRow = formatTrainRow(train);
        trainRow.y = i * 6;
        trains.addChild(trainRow);
    }

    return trains;
}

export const trains = async (parent: Container) => {
	let trains = await fetchTrains();
    parent.addChild(trains);

    setInterval(async () => {
        let t = await fetchTrains();
        parent.removeChild(trains);
        parent.addChild(trains = t);
    }, 10 * 1000);

    const icon = new Text('🚅🚃🚃🚃', {
        fontSize: 8,
    });
    icon.x = 132;
    icon.y = 22;
    parent.addChild(icon);

    gsap.to(icon, {
        x: -50, duration: 10, repeat: -1, yoyo: false, repeatDelay: 0, ease: 'linear'
    })

	return async (dt: number) => {
	};
};
